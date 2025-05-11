/**
 * 配置管理
 * 
 * 从环境变量加载配置，并提供默认值
 */

// 从.env文件加载环境变量
require('dotenv').config();

// 配置对象
const config = {
  // 服务器配置
  PORT: process.env.PORT || 3000,
  API_PORT: process.env.API_PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 安全配置
  SAFE_TOKEN: process.env.SAFE_TOKEN || 'your-token',
  
  // 缓存配置
  CACHE_DURATION: parseInt(process.env.CACHE_DURATION || 300, 10), // 秒
  PROXY_CACHE_DURATION: parseInt(process.env.PROXY_CACHE_DURATION || 60000, 10), // 毫秒
  
  // 代理配置
  PROXY_STRATEGY: process.env.PROXY_STRATEGY || 'fastest', // fastest, random, round-robin
  
  // 多域名并行下载配置
  ENABLE_MULTI_PROXY: process.env.ENABLE_MULTI_PROXY === 'true',
  SMALL_FILE_THRESHOLD: parseInt(process.env.SMALL_FILE_THRESHOLD || 5, 10), // MB
  MEDIUM_FILE_THRESHOLD: parseInt(process.env.MEDIUM_FILE_THRESHOLD || 50, 10), // MB
  LARGE_FILE_THRESHOLD: parseInt(process.env.LARGE_FILE_THRESHOLD || 100, 10), // MB
  
  // 代理域名列表URL
  PROXY_DOMAINS_URL: process.env.PROXY_DOMAINS_URL || 'https://raw.githubusercontent.com/rdone4425/qita/refs/heads/main/proxy.txt',
  
  // 代理域名本地存储路径
  PROXY_DOMAINS_FILE: process.env.PROXY_DOMAINS_FILE || './data/proxy.txt',
  
  // 健康检查配置
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || 3600000, 10), // 毫秒，默认1小时
};

module.exports = config;
