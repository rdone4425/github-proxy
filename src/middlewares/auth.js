/**
 * 认证中间件
 * 
 * 验证API请求的token
 */

const config = require('../config');
const logger = require('./logger');

/**
 * 验证请求中的token
 */
const authMiddleware = (req, res, next) => {
  // 从查询参数获取token
  const token = req.query.token;
  
  // 如果没有提供token
  if (!token) {
    logger.warn('API请求未提供token');
    return res.status(401).json({
      成功: false,
      错误: '未提供认证token'
    });
  }
  
  // 验证token
  if (token !== config.SAFE_TOKEN) {
    logger.warn(`API请求提供了无效的token: ${token}`);
    return res.status(403).json({
      成功: false,
      错误: '无效的认证token'
    });
  }
  
  // token有效，继续处理请求
  next();
};

module.exports = authMiddleware;
