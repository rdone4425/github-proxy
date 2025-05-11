/**
 * 代理路由
 * 
 * 处理GitHub资源的代理请求
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { getProxyDomain, getProxyCountByFileSize } = require('../utils/proxy');
const { incrementStats } = require('../utils/stats');
const logger = require('../middlewares/logger');
const axios = require('axios');

/**
 * 创建代理路由
 */
const createProxyRouter = () => {
  const router = express.Router();
  
  // 处理GitHub资源代理请求
  router.use('/:protocol(https?)://:host/:path(*)', async (req, res, next) => {
    try {
      const { protocol, host, path } = req.params;
      const originalUrl = `${protocol}://${host}/${path}`;
      
      // 检查是否是GitHub相关域名
      const isGitHubResource = host.includes('github') || 
                              host.includes('githubusercontent') || 
                              host.includes('githubassets');
      
      if (!isGitHubResource) {
        return res.status(403).json({
          成功: false,
          错误: '只支持代理GitHub相关资源'
        });
      }
      
      // 获取代理域名
      const proxyDomain = await getProxyDomain();
      
      if (!proxyDomain) {
        return res.status(500).json({
          成功: false,
          错误: '无法获取代理域名'
        });
      }
      
      // 构建代理URL
      const proxyUrl = `https://${proxyDomain}/${originalUrl}`;
      
      // 记录请求
      logger.info(`代理请求: ${originalUrl} -> ${proxyUrl}`);
      
      // 更新统计信息
      incrementStats('proxyRequests');
      
      // 处理Range请求（断点续传）
      const rangeHeader = req.headers.range;
      const headers = { ...req.headers };
      
      // 删除一些可能导致问题的头部
      delete headers.host;
      delete headers.connection;
      
      // 获取文件
      try {
        const axiosConfig = {
          method: req.method,
          url: proxyUrl,
          headers,
          responseType: 'stream',
          maxRedirects: 5
        };
        
        // 如果是POST/PUT请求，添加请求体
        if (['POST', 'PUT'].includes(req.method)) {
          axiosConfig.data = req.body;
        }
        
        const response = await axios(axiosConfig);
        
        // 设置响应头
        Object.keys(response.headers).forEach(key => {
          res.setHeader(key, response.headers[key]);
        });
        
        // 设置状态码
        res.status(response.status);
        
        // 更新统计信息
        incrementStats('proxyBytes', parseInt(response.headers['content-length'] || 0, 10));
        
        // 发送响应
        response.data.pipe(res);
      } catch (err) {
        if (err.response) {
          // 设置响应头
          Object.keys(err.response.headers).forEach(key => {
            res.setHeader(key, err.response.headers[key]);
          });
          
          // 设置状态码
          res.status(err.response.status);
          
          // 发送响应
          err.response.data.pipe(res);
        } else {
          // 处理网络错误
          logger.error(`代理请求失败: ${err.message}`, { error: err.stack });
          res.status(500).json({
            成功: false,
            错误: `代理请求失败: ${err.message}`
          });
        }
      }
    } catch (err) {
      logger.error(`代理请求处理失败: ${err.message}`, { error: err.stack });
      next(err);
    }
  });
  
  return router;
};

module.exports = {
  createProxyRouter
};
