/**
 * 代理控制器
 * 
 * 处理GitHub资源代理请求
 */

const axios = require('axios');
const { getProxyDomain, getProxyDomains } = require('../utils/proxy');
const { cacheGet, cacheSet } = require('../utils/cache');
const { incrementStats } = require('../utils/stats');
const logger = require('../middlewares/logger');
const config = require('../config');

/**
 * 获取最快的代理域名
 */
const getFastestProxy = async (req, res) => {
  try {
    const proxyDomain = await getProxyDomain();
    
    if (!proxyDomain) {
      return res.status(500).json({
        成功: false,
        错误: '无法获取代理域名'
      });
    }
    
    res.json({
      成功: true,
      代理: proxyDomain
    });
  } catch (err) {
    logger.error(`获取最快代理域名失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取代理域名失败: ${err.message}`
    });
  }
};

/**
 * 获取代理后的URL
 */
const getProxyUrl = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        成功: false,
        错误: '缺少URL参数'
      });
    }
    
    const proxyDomain = await getProxyDomain();
    
    if (!proxyDomain) {
      return res.status(500).json({
        成功: false,
        错误: '无法获取代理域名'
      });
    }
    
    const proxyUrl = `https://${proxyDomain}/${url}`;
    
    res.json({
      成功: true,
      原始URL: url,
      代理URL: proxyUrl
    });
  } catch (err) {
    logger.error(`获取代理URL失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取代理URL失败: ${err.message}`
    });
  }
};

/**
 * 获取文件下载信息
 */
const getDownloadInfo = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        成功: false,
        错误: '缺少URL参数'
      });
    }
    
    const proxyDomain = await getProxyDomain();
    
    if (!proxyDomain) {
      return res.status(500).json({
        成功: false,
        错误: '无法获取代理域名'
      });
    }
    
    const proxyUrl = `https://${proxyDomain}/${url}`;
    
    // 获取文件大小
    const headResponse = await axios.head(proxyUrl);
    const contentLength = headResponse.headers['content-length'];
    const contentType = headResponse.headers['content-type'];
    
    res.json({
      成功: true,
      原始URL: url,
      代理URL: proxyUrl,
      文件大小: contentLength ? parseInt(contentLength, 10) : null,
      文件类型: contentType || 'application/octet-stream'
    });
  } catch (err) {
    logger.error(`获取下载信息失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取下载信息失败: ${err.message}`
    });
  }
};

/**
 * 获取多域名并行下载信息
 */
const getMultiDownloadInfo = async (req, res) => {
  try {
    const { url } = req.query;
    let { count } = req.query;
    
    if (!url) {
      return res.status(400).json({
        成功: false,
        错误: '缺少URL参数'
      });
    }
    
    // 默认使用5个代理域名
    count = parseInt(count, 10) || 5;
    
    // 获取所有可用代理域名
    const proxyDomains = getProxyDomains();
    
    if (!proxyDomains || proxyDomains.length === 0) {
      return res.status(500).json({
        成功: false,
        错误: '无法获取代理域名'
      });
    }
    
    // 限制代理域名数量
    const availableCount = Math.min(count, proxyDomains.length);
    const selectedDomains = proxyDomains.slice(0, availableCount);
    
    // 获取文件大小
    const proxyUrl = `https://${selectedDomains[0]}/${url}`;
    const headResponse = await axios.head(proxyUrl);
    const contentLength = headResponse.headers['content-length'];
    const contentType = headResponse.headers['content-type'];
    
    // 如果无法获取文件大小，则无法进行分块下载
    if (!contentLength) {
      return res.json({
        成功: true,
        原始URL: url,
        代理URL: proxyUrl,
        文件大小: null,
        文件类型: contentType || 'application/octet-stream',
        代理域名: [selectedDomains[0]],
        分块信息: null
      });
    }
    
    const fileSize = parseInt(contentLength, 10);
    
    // 计算每个分块的大小
    const chunkSize = Math.ceil(fileSize / availableCount);
    
    // 生成分块信息
    const chunks = [];
    for (let i = 0; i < availableCount; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize - 1, fileSize - 1);
      
      chunks.push({
        代理域名: selectedDomains[i],
        代理URL: `https://${selectedDomains[i]}/${url}`,
        开始字节: start,
        结束字节: end,
        大小: end - start + 1
      });
    }
    
    res.json({
      成功: true,
      原始URL: url,
      文件大小: fileSize,
      文件类型: contentType || 'application/octet-stream',
      代理域名: selectedDomains,
      分块数量: chunks.length,
      分块信息: chunks
    });
  } catch (err) {
    logger.error(`获取多域名下载信息失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取多域名下载信息失败: ${err.message}`
    });
  }
};

/**
 * 获取仓库发布列表
 */
const getRepoReleases = async (req, res) => {
  try {
    const { repo } = req.query;
    
    if (!repo) {
      return res.status(400).json({
        成功: false,
        错误: '缺少repo参数'
      });
    }
    
    // 检查缓存
    const cacheKey = `releases:${repo}`;
    const cachedData = cacheGet(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // 获取发布列表
    const apiUrl = `https://api.github.com/repos/${repo}/releases`;
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Proxy-Service'
      }
    });
    
    // 处理发布数据
    const releases = response.data.map(release => {
      return {
        id: release.id,
        名称: release.name,
        标签: release.tag_name,
        发布时间: release.published_at,
        预发布: release.prerelease,
        下载: release.assets.map(asset => {
          return {
            名称: asset.name,
            大小: asset.size,
            下载次数: asset.download_count,
            原始URL: asset.browser_download_url
          };
        })
      };
    });
    
    const result = {
      成功: true,
      仓库: repo,
      发布数量: releases.length,
      发布列表: releases
    };
    
    // 缓存结果
    cacheSet(cacheKey, result);
    
    res.json(result);
  } catch (err) {
    logger.error(`获取仓库发布列表失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取仓库发布列表失败: ${err.message}`
    });
  }
};

/**
 * 获取加速克隆命令
 */
const getCloneCommand = async (req, res) => {
  try {
    const { repo } = req.query;
    
    if (!repo) {
      return res.status(400).json({
        成功: false,
        错误: '缺少repo参数'
      });
    }
    
    // 提取仓库信息
    let repoUrl = repo;
    if (!repoUrl.startsWith('http')) {
      repoUrl = `https://github.com/${repo}.git`;
    }
    
    const proxyDomain = await getProxyDomain();
    
    if (!proxyDomain) {
      return res.status(500).json({
        成功: false,
        错误: '无法获取代理域名'
      });
    }
    
    // 替换域名
    const proxyUrl = repoUrl.replace('github.com', proxyDomain);
    
    // 生成克隆命令
    const cloneCommand = `git clone ${proxyUrl}`;
    
    res.json({
      成功: true,
      原始URL: repoUrl,
      代理URL: proxyUrl,
      克隆命令: cloneCommand
    });
  } catch (err) {
    logger.error(`获取克隆命令失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `获取克隆命令失败: ${err.message}`
    });
  }
};

module.exports = {
  getFastestProxy,
  getProxyUrl,
  getDownloadInfo,
  getMultiDownloadInfo,
  getRepoReleases,
  getCloneCommand
};
