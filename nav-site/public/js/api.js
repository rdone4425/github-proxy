/**
 * API 接口
 * 使用本地存储模拟后端数据存储
 */

const api = {
    // 存储键名
    STORAGE_KEYS: {
        WEBSITES: 'nav_websites',
        CATEGORIES: 'nav_categories',
        SETTINGS: 'nav_settings'
    },

    // 初始化数据
    init() {
        // 检查是否已初始化
        if (!storage.get(this.STORAGE_KEYS.WEBSITES)) {
            storage.save(this.STORAGE_KEYS.WEBSITES, []);
        }

        if (!storage.get(this.STORAGE_KEYS.CATEGORIES)) {
            storage.save(this.STORAGE_KEYS.CATEGORIES, []);
        }

        if (!storage.get(this.STORAGE_KEYS.SETTINGS)) {
            storage.save(this.STORAGE_KEYS.SETTINGS, {
                siteTitle: '我的导航',
                footerText: '© 2023 导航网站 - 保留所有权利'
            });
        }
    },

    // 网站相关 API

    // 获取所有网站
    async getWebsites() {
        this.init();
        return storage.get(this.STORAGE_KEYS.WEBSITES) || [];
    },

    // 添加网站
    async addWebsite(websiteData) {
        this.init();
        const websites = await this.getWebsites();

        // 提取域名
        let domain = '';
        try {
            domain = new URL(websiteData.url).hostname;
        } catch (error) {
            console.warn('无法解析URL:', websiteData.url);
        }

        const newWebsite = {
            id: generateId(),
            url: websiteData.url,
            title: websiteData.title,
            description: websiteData.description || '',
            categoryId: websiteData.categoryId,
            keywords: websiteData.keywords || '',
            favicon: websiteData.favicon || '',
            domain: domain,
            createdAt: new Date().toISOString()
        };

        websites.push(newWebsite);
        storage.save(this.STORAGE_KEYS.WEBSITES, websites);

        return newWebsite;
    },

    // 更新网站
    async updateWebsite(websiteData) {
        this.init();
        const websites = await this.getWebsites();

        const index = websites.findIndex(site => site.id === websiteData.id);
        if (index === -1) {
            throw new Error('网站不存在');
        }

        // 提取域名（如果URL已更改）
        let domain = websites[index].domain || '';
        if (websiteData.url !== websites[index].url) {
            try {
                domain = new URL(websiteData.url).hostname;
            } catch (error) {
                console.warn('无法解析URL:', websiteData.url);
            }
        }

        websites[index] = {
            ...websites[index],
            url: websiteData.url,
            title: websiteData.title,
            description: websiteData.description || '',
            categoryId: websiteData.categoryId,
            keywords: websiteData.keywords || '',
            favicon: websiteData.favicon || '',
            domain: domain,
            updatedAt: new Date().toISOString()
        };

        storage.save(this.STORAGE_KEYS.WEBSITES, websites);

        return websites[index];
    },

    // 删除网站
    async deleteWebsite(websiteId) {
        this.init();
        const websites = await this.getWebsites();

        const filteredWebsites = websites.filter(site => site.id !== websiteId);

        if (filteredWebsites.length === websites.length) {
            throw new Error('网站不存在');
        }

        storage.save(this.STORAGE_KEYS.WEBSITES, filteredWebsites);

        return { success: true };
    },

    // 分类相关 API

    // 获取所有分类
    async getCategories() {
        this.init();
        return storage.get(this.STORAGE_KEYS.CATEGORIES) || [];
    },

    // 添加分类
    async addCategory(categoryData) {
        this.init();
        const categories = await this.getCategories();

        const newCategory = {
            id: generateId(),
            name: categoryData.name,
            parentId: categoryData.parentId || null,
            order: categoryData.order || 50000, // 添加序号字段
            createdAt: new Date().toISOString()
        };

        categories.push(newCategory);
        storage.save(this.STORAGE_KEYS.CATEGORIES, categories);

        return newCategory;
    },

    // 更新分类
    async updateCategory(categoryData) {
        this.init();
        const categories = await this.getCategories();

        const index = categories.findIndex(cat => cat.id === categoryData.id);
        if (index === -1) {
            throw new Error('分类不存在');
        }

        categories[index] = {
            ...categories[index],
            name: categoryData.name,
            parentId: categoryData.parentId || null,
            order: categoryData.order || categories[index].order || 50000, // 添加序号字段
            updatedAt: new Date().toISOString()
        };

        storage.save(this.STORAGE_KEYS.CATEGORIES, categories);

        return categories[index];
    },

    // 删除分类
    async deleteCategory(categoryId) {
        this.init();
        const categories = await this.getCategories();

        const filteredCategories = categories.filter(cat => cat.id !== categoryId);

        if (filteredCategories.length === categories.length) {
            throw new Error('分类不存在');
        }

        storage.save(this.STORAGE_KEYS.CATEGORIES, filteredCategories);

        return { success: true };
    },

    // 设置相关 API

    // 获取设置
    async getSettings() {
        this.init();
        return storage.get(this.STORAGE_KEYS.SETTINGS) || {};
    },

    // 更新设置
    async updateSettings(settingsData) {
        this.init();
        const currentSettings = await this.getSettings();

        const updatedSettings = {
            ...currentSettings,
            ...settingsData,
            updatedAt: new Date().toISOString()
        };

        storage.save(this.STORAGE_KEYS.SETTINGS, updatedSettings);

        return updatedSettings;
    },

    // 网站信息获取
    async fetchWebsiteInfo(url) {
        try {
            // 检查URL格式
            if (!url) {
                throw new Error('URL不能为空');
            }

            // 规范化URL
            if (!url.match(/^https?:\/\//i)) {
                url = 'https://' + url;
            }

            // 尝试使用 Cloudflare Pages Function 获取网站信息
            try {
                // 构建API请求URL (适配 Cloudflare Pages Functions)
                const apiUrl = '/api/fetch-website-info?url=' + encodeURIComponent(url);

                // 发送请求
                const response = await fetch(apiUrl);

                // 检查响应状态
                if (!response.ok) {
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }

                // 解析响应数据
                const data = await response.json();

                // 返回网站信息
                return {
                    title: data.title || this._extractTitleFromDomain(url),
                    description: data.description || '',
                    favicon: data.favicon || this._getDefaultFavicon(url),
                    thumbnail: data.thumbnail || '',
                    keywords: data.keywords || '',
                    domain: data.domain || extractDomain(url),
                    url: data.url || url,
                    additionalInfo: data.additionalInfo || {}
                };
            } catch (apiError) {
                console.warn('后端API获取失败，使用备用方法:', apiError);

                // 如果后端API请求失败，使用备用方法
                return this._fallbackFetchWebsiteInfo(url);
            }
        } catch (error) {
            console.error('获取网站信息失败:', error);

            // 返回基本信息而不是null，这样即使请求失败也能返回一些信息
            return {
                title: this._extractTitleFromDomain(url),
                description: '',
                favicon: this._getDefaultFavicon(url),
                url: url,
                domain: extractDomain(url),
                error: error.message
            };
        }
    },

    // 备用网站信息获取方法（当后端API不可用时使用）
    async _fallbackFetchWebsiteInfo(url) {
        // 从URL中提取域名
        const domain = extractDomain(url);

        // 生成基本信息
        return {
            title: this._extractTitleFromDomain(url),
            description: `这是 ${domain} 的网站`,
            favicon: this._getDefaultFavicon(url),
            domain: domain,
            url: url,
            source: 'fallback'
        };
    },

    // 从域名中提取标题
    _extractTitleFromDomain(url) {
        try {
            const domain = extractDomain(url);
            if (!domain) return '未知网站';

            // 移除www前缀
            const baseDomain = domain.replace(/^www\./, '');

            // 获取主域名部分（不包括TLD）
            const parts = baseDomain.split('.');
            if (parts.length > 0) {
                // 将第一个部分首字母大写
                return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }

            return baseDomain;
        } catch (error) {
            return '未知网站';
        }
    },

    // 获取默认图标URL
    _getDefaultFavicon(url) {
        try {
            const domain = extractDomain(url);
            if (!domain) return '';

            // 使用Google的favicon服务
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch (error) {
            return '';
        }
    },

    // 批量获取多个网站的信息
    async fetchMultipleWebsites(urls) {
        if (!Array.isArray(urls) || urls.length === 0) {
            return [];
        }

        // 并行获取所有网站信息
        const promises = urls.map(url => this.fetchWebsiteInfo(url));
        const results = await Promise.all(promises);

        return results.filter(result => result !== null);
    }
};

// 初始化API
document.addEventListener('DOMContentLoaded', () => {
    api.init();
});
