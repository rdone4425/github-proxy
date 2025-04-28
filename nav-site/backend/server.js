/**
 * 导航网站后端服务器
 * 
 * 这是一个简单的 Express 服务器，提供以下功能：
 * 1. 提供静态文件服务
 * 2. 提供网站信息获取 API
 * 3. 提供数据持久化 API（可选）
 * 
 * 注意：当前版本使用的是前端本地存储，不需要后端数据持久化
 * 如果需要后端数据持久化，可以取消注释相关代码
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../')));

// 网站信息获取 API
app.get('/api/fetch-website-info', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: '缺少URL参数' });
    }
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        });
        
        const $ = cheerio.load(response.data);
        
        // 获取网站标题
        const title = $('title').text().trim() || '';
        
        // 获取网站描述
        let description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
        
        // 获取网站图标
        let favicon = $('link[rel="icon"]').attr('href') || 
                     $('link[rel="shortcut icon"]').attr('href') || '';
        
        // 如果图标URL是相对路径，转换为绝对路径
        if (favicon && !favicon.startsWith('http')) {
            const urlObj = new URL(url);
            favicon = favicon.startsWith('/') 
                ? `${urlObj.protocol}//${urlObj.host}${favicon}`
                : `${urlObj.protocol}//${urlObj.host}/${favicon}`;
        }
        
        res.json({
            title,
            description,
            favicon,
            url
        });
    } catch (error) {
        console.error('获取网站信息失败:', error.message);
        res.status(500).json({ error: '获取网站信息失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

/**
 * 数据持久化 API（可选）
 * 如果需要后端数据持久化，可以取消注释以下代码
 */

/*
// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const WEBSITES_FILE = path.join(DATA_DIR, 'websites.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
function initDataFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData), 'utf8');
    }
}

// 初始化数据文件
initDataFile(WEBSITES_FILE, []);
initDataFile(CATEGORIES_FILE, []);
initDataFile(SETTINGS_FILE, {
    siteTitle: '我的导航',
    footerText: '© 2023 导航网站 - 保留所有权利'
});

// 读取数据
function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`读取数据失败 (${filePath}):`, error);
        return null;
    }
}

// 写入数据
function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`写入数据失败 (${filePath}):`, error);
        return false;
    }
}

// 网站 API
app.get('/api/websites', (req, res) => {
    const websites = readData(WEBSITES_FILE);
    res.json(websites || []);
});

app.post('/api/websites', (req, res) => {
    const websites = readData(WEBSITES_FILE) || [];
    const newWebsite = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    
    websites.push(newWebsite);
    
    if (writeData(WEBSITES_FILE, websites)) {
        res.status(201).json(newWebsite);
    } else {
        res.status(500).json({ error: '保存网站失败' });
    }
});

app.put('/api/websites/:id', (req, res) => {
    const { id } = req.params;
    const websites = readData(WEBSITES_FILE) || [];
    
    const index = websites.findIndex(site => site.id === id);
    if (index === -1) {
        return res.status(404).json({ error: '网站不存在' });
    }
    
    websites[index] = {
        ...websites[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };
    
    if (writeData(WEBSITES_FILE, websites)) {
        res.json(websites[index]);
    } else {
        res.status(500).json({ error: '更新网站失败' });
    }
});

app.delete('/api/websites/:id', (req, res) => {
    const { id } = req.params;
    const websites = readData(WEBSITES_FILE) || [];
    
    const filteredWebsites = websites.filter(site => site.id !== id);
    
    if (filteredWebsites.length === websites.length) {
        return res.status(404).json({ error: '网站不存在' });
    }
    
    if (writeData(WEBSITES_FILE, filteredWebsites)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: '删除网站失败' });
    }
});

// 分类 API
app.get('/api/categories', (req, res) => {
    const categories = readData(CATEGORIES_FILE);
    res.json(categories || []);
});

app.post('/api/categories', (req, res) => {
    const categories = readData(CATEGORIES_FILE) || [];
    const newCategory = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    
    if (writeData(CATEGORIES_FILE, categories)) {
        res.status(201).json(newCategory);
    } else {
        res.status(500).json({ error: '保存分类失败' });
    }
});

app.put('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const categories = readData(CATEGORIES_FILE) || [];
    
    const index = categories.findIndex(cat => cat.id === id);
    if (index === -1) {
        return res.status(404).json({ error: '分类不存在' });
    }
    
    categories[index] = {
        ...categories[index],
        ...req.body,
        updatedAt: new Date().toISOString()
    };
    
    if (writeData(CATEGORIES_FILE, categories)) {
        res.json(categories[index]);
    } else {
        res.status(500).json({ error: '更新分类失败' });
    }
});

app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const categories = readData(CATEGORIES_FILE) || [];
    
    const filteredCategories = categories.filter(cat => cat.id !== id);
    
    if (filteredCategories.length === categories.length) {
        return res.status(404).json({ error: '分类不存在' });
    }
    
    if (writeData(CATEGORIES_FILE, filteredCategories)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: '删除分类失败' });
    }
});

// 设置 API
app.get('/api/settings', (req, res) => {
    const settings = readData(SETTINGS_FILE);
    res.json(settings || {});
});

app.put('/api/settings', (req, res) => {
    const currentSettings = readData(SETTINGS_FILE) || {};
    
    const updatedSettings = {
        ...currentSettings,
        ...req.body,
        updatedAt: new Date().toISOString()
    };
    
    if (writeData(SETTINGS_FILE, updatedSettings)) {
        res.json(updatedSettings);
    } else {
        res.status(500).json({ error: '更新设置失败' });
    }
});
*/
