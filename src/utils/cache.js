/**
 * 缓存工具
 * 
 * 提供内存缓存功能
 */

const config = require('../config');
const logger = require('../middlewares/logger');

// 缓存对象
const cache = {};

/**
 * 从缓存中获取数据
 * @param {string} key - 缓存键
 * @returns {*} - 缓存的数据，如果不存在或已过期则返回null
 */
const cacheGet = (key) => {
  const item = cache[key];
  
  // 如果缓存项不存在，返回null
  if (!item) {
    return null;
  }
  
  // 检查缓存是否过期
  if (item.expiry && item.expiry < Date.now()) {
    // 删除过期缓存
    delete cache[key];
    return null;
  }
  
  return item.data;
};

/**
 * 将数据存入缓存
 * @param {string} key - 缓存键
 * @param {*} data - 要缓存的数据
 * @param {number} [ttl] - 缓存生存时间（毫秒），默认使用配置中的CACHE_DURATION
 */
const cacheSet = (key, data, ttl) => {
  // 计算过期时间
  const expiry = ttl ? Date.now() + ttl : Date.now() + config.CACHE_DURATION * 1000;
  
  // 存储数据和过期时间
  cache[key] = {
    data,
    expiry
  };
};

/**
 * 从缓存中删除数据
 * @param {string} key - 缓存键
 */
const cacheDelete = (key) => {
  delete cache[key];
};

/**
 * 清除所有缓存
 */
const clearCache = () => {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
  
  logger.info('缓存已清除');
};

/**
 * 清除过期缓存
 */
const clearExpiredCache = () => {
  const now = Date.now();
  let expiredCount = 0;
  
  Object.keys(cache).forEach(key => {
    const item = cache[key];
    if (item.expiry && item.expiry < now) {
      delete cache[key];
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    logger.info(`已清除 ${expiredCount} 个过期缓存项`);
  }
};

// 定期清除过期缓存
setInterval(clearExpiredCache, 60000); // 每分钟清理一次

module.exports = {
  cacheGet,
  cacheSet,
  cacheDelete,
  clearCache
};
