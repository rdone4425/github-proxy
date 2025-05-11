/**
 * 页面路由
 * 
 * 处理页面请求
 */

const express = require('express');
const path = require('path');
const { getStats } = require('../utils/stats');
const { getProxyDomains } = require('../utils/proxy');
const config = require('../config');

const router = express.Router();

// 首页
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// 统计页面
router.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/stats.html'));
});

// 多域名并行下载页面
router.get('/multi-download', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/multi-download.html'));
});

// 获取前端配置
router.get('/config.js', (req, res) => {
  // 只返回前端需要的配置
  const frontendConfig = {
    PROXY_STRATEGY: config.PROXY_STRATEGY,
    ENABLE_MULTI_PROXY: config.ENABLE_MULTI_PROXY,
    SMALL_FILE_THRESHOLD: config.SMALL_FILE_THRESHOLD,
    MEDIUM_FILE_THRESHOLD: config.MEDIUM_FILE_THRESHOLD,
    LARGE_FILE_THRESHOLD: config.LARGE_FILE_THRESHOLD
  };
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.CONFIG = ${JSON.stringify(frontendConfig, null, 2)};`);
});

module.exports = router;
