/**
 * GitHub代理服务应用程序
 * 
 * 这个文件定义了Express应用程序的主要配置和中间件
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./middlewares/logger');
const { createProxyRouter } = require('./routes/proxy');
const apiRouter = require('./routes/api');
const pagesRouter = require('./routes/pages');
const { initProxyDomains } = require('./utils/proxy');

// 创建Express应用
const app = express();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 跨域支持
app.use(cors());

// 请求日志
app.use(logger.requestLogger);

// 请求速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 解析JSON请求体
app.use(express.json());

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.use('/api', apiRouter);
app.use('/', pagesRouter);

// 初始化代理域名列表
initProxyDomains()
  .then(() => {
    // 代理路由 - 必须在其他路由之后，因为它会处理所有未匹配的路由
    app.use('/', createProxyRouter());
    
    // 错误处理中间件
    app.use((err, req, res, next) => {
      logger.error(`错误: ${err.message}`, { error: err.stack });
      res.status(err.status || 500).json({
        成功: false,
        错误: err.message || '服务器内部错误'
      });
    });
    
    // 404处理
    app.use((req, res) => {
      res.status(404).json({
        成功: false,
        错误: '未找到请求的资源'
      });
    });
  })
  .catch(err => {
    logger.error(`初始化代理域名失败: ${err.message}`, { error: err.stack });
  });

module.exports = app;
