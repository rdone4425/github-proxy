/**
 * GitHub代理服务主入口文件
 * 
 * 这个文件启动主服务器
 */

require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./middlewares/logger');
const { scheduleHealthCheck } = require('./utils/proxy');

// 启动服务器
const server = app.listen(config.PORT, () => {
  logger.info(`主服务器已启动，监听端口 ${config.PORT}`);
  logger.info(`环境: ${config.NODE_ENV}`);
  logger.info(`代理策略: ${config.PROXY_STRATEGY}`);
  
  // 启动定时健康检查
  scheduleHealthCheck();
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error(`未捕获的异常: ${err.message}`, { error: err.stack });
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`未处理的Promise拒绝: ${reason}`, { promise });
});

// 处理进程终止信号
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

module.exports = server;
