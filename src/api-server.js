/**
 * GitHub代理服务API服务器
 * 
 * 这个文件启动API服务器，用于管理和监控
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./middlewares/logger');
const authMiddleware = require('./middlewares/auth');
const { getProxyDomains, updateProxyDomains, checkProxyHealth } = require('./utils/proxy');
const { getStats, resetStats } = require('./utils/stats');
const { clearCache } = require('./utils/cache');

// 创建Express应用
const app = express();

// 安全中间件
app.use(helmet());

// 跨域支持
app.use(cors());

// 请求日志
app.use(logger.requestLogger);

// 解析JSON请求体
app.use(express.json());

// API路由
const apiRouter = express.Router();

// 获取代理域名列表
apiRouter.get('/domains', authMiddleware, (req, res) => {
  const domains = getProxyDomains();
  res.json({
    成功: true,
    数量: domains.length,
    域名列表: domains
  });
});

// 更新代理域名列表
apiRouter.get('/update-domains', authMiddleware, async (req, res) => {
  try {
    const result = await updateProxyDomains();
    res.json({
      成功: true,
      消息: '代理域名列表已更新',
      数量: result.length
    });
  } catch (err) {
    logger.error(`更新代理域名失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `更新代理域名失败: ${err.message}`
    });
  }
});

// 健康检查
apiRouter.get('/health', authMiddleware, async (req, res) => {
  try {
    const result = await checkProxyHealth();
    res.json({
      成功: true,
      消息: '健康检查完成',
      结果: result
    });
  } catch (err) {
    logger.error(`健康检查失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `健康检查失败: ${err.message}`
    });
  }
});

// 清除缓存
apiRouter.get('/clear-cache', authMiddleware, (req, res) => {
  try {
    clearCache();
    res.json({
      成功: true,
      消息: '缓存已清除'
    });
  } catch (err) {
    logger.error(`清除缓存失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `清除缓存失败: ${err.message}`
    });
  }
});

// 获取统计信息
apiRouter.get('/stats', authMiddleware, (req, res) => {
  const stats = getStats();
  res.json({
    成功: true,
    统计: stats
  });
});

// 重置统计信息
apiRouter.get('/stats/reset', authMiddleware, (req, res) => {
  resetStats();
  res.json({
    成功: true,
    消息: '统计信息已重置'
  });
});

// 使用API路由
app.use('/api', apiRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`API错误: ${err.message}`, { error: err.stack });
  res.status(err.status || 500).json({
    成功: false,
    错误: err.message || 'API服务器内部错误'
  });
});

// 启动服务器
const server = app.listen(config.API_PORT, () => {
  logger.info(`API服务器已启动，监听端口 ${config.API_PORT}`);
});

// 处理进程终止信号
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭API服务器...');
  server.close(() => {
    logger.info('API服务器已关闭');
    process.exit(0);
  });
});

module.exports = server;
