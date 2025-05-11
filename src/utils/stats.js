/**
 * 统计工具
 * 
 * 提供流量和请求统计功能
 */

const logger = require('../middlewares/logger');

// 统计数据
const stats = {
  startTime: Date.now(),
  proxyRequests: 0,
  proxyBytes: 0,
  apiRequests: 0,
  errors: 0,
  domainStats: {} // 按域名统计
};

/**
 * 增加统计计数
 * @param {string} key - 统计键
 * @param {number} [value=1] - 增加的值
 * @param {string} [domain] - 代理域名（可选）
 */
const incrementStats = (key, value = 1, domain = null) => {
  // 更新全局统计
  if (stats[key] !== undefined) {
    stats[key] += value;
  } else {
    stats[key] = value;
  }
  
  // 如果提供了域名，更新域名统计
  if (domain) {
    if (!stats.domainStats[domain]) {
      stats.domainStats[domain] = {
        requests: 0,
        bytes: 0,
        errors: 0
      };
    }
    
    switch (key) {
      case 'proxyRequests':
        stats.domainStats[domain].requests += value;
        break;
      case 'proxyBytes':
        stats.domainStats[domain].bytes += value;
        break;
      case 'errors':
        stats.domainStats[domain].errors += value;
        break;
    }
  }
};

/**
 * 获取统计数据
 * @returns {Object} 统计数据
 */
const getStats = () => {
  const now = Date.now();
  const uptime = now - stats.startTime;
  
  // 计算每秒请求数和每秒字节数
  const requestsPerSecond = stats.proxyRequests / (uptime / 1000);
  const bytesPerSecond = stats.proxyBytes / (uptime / 1000);
  
  // 格式化字节数
  const formattedBytes = formatBytes(stats.proxyBytes);
  const formattedBytesPerSecond = formatBytes(bytesPerSecond) + '/s';
  
  // 计算域名统计排名
  const domainRanking = Object.entries(stats.domainStats)
    .map(([domain, data]) => ({
      域名: domain,
      请求数: data.requests,
      流量: formatBytes(data.bytes),
      错误数: data.errors
    }))
    .sort((a, b) => b.请求数 - a.请求数);
  
  return {
    开始时间: new Date(stats.startTime).toISOString(),
    运行时间: formatDuration(uptime),
    代理请求数: stats.proxyRequests,
    API请求数: stats.apiRequests,
    错误数: stats.errors,
    总流量: formattedBytes,
    每秒请求数: requestsPerSecond.toFixed(2),
    每秒流量: formattedBytesPerSecond,
    域名统计: domainRanking
  };
};

/**
 * 重置统计数据
 */
const resetStats = () => {
  stats.startTime = Date.now();
  stats.proxyRequests = 0;
  stats.proxyBytes = 0;
  stats.apiRequests = 0;
  stats.errors = 0;
  stats.domainStats = {};
  
  logger.info('统计数据已重置');
};

/**
 * 格式化字节数
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化持续时间
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的字符串
 */
const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天 ${hours % 24}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
};

module.exports = {
  incrementStats,
  getStats,
  resetStats
};
