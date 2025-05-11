/**
 * 代理工具函数
 * 
 * 管理代理域名列表和代理策略
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const logger = require('../middlewares/logger');
const { cacheGet, cacheSet } = require('./cache');

// 代理域名列表
let proxyDomains = [];
// 当前轮询索引
let roundRobinIndex = 0;
// 域名性能缓存
const domainPerformance = {};

/**
 * 初始化代理域名列表
 */
const initProxyDomains = async () => {
  try {
    // 尝试从本地文件加载
    if (fs.existsSync(config.PROXY_DOMAINS_FILE)) {
      const data = fs.readFileSync(config.PROXY_DOMAINS_FILE, 'utf8');
      proxyDomains = data.split('\n').filter(domain => domain.trim());
      logger.info(`从本地文件加载了 ${proxyDomains.length} 个代理域名`);
    }
    
    // 如果本地文件不存在或为空，则从远程URL获取
    if (proxyDomains.length === 0) {
      await updateProxyDomains();
    }
    
    return proxyDomains;
  } catch (err) {
    logger.error(`初始化代理域名失败: ${err.message}`, { error: err.stack });
    throw err;
  }
};

/**
 * 更新代理域名列表
 */
const updateProxyDomains = async () => {
  try {
    // 从远程URL获取代理域名列表
    const response = await axios.get(config.PROXY_DOMAINS_URL);
    const data = response.data;
    
    // 解析域名列表
    const domains = data.split('\n').filter(domain => domain.trim());
    
    if (domains.length === 0) {
      throw new Error('获取到的代理域名列表为空');
    }
    
    // 更新内存中的域名列表
    proxyDomains = domains;
    
    // 确保目录存在
    const dir = path.dirname(config.PROXY_DOMAINS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 保存到本地文件
    fs.writeFileSync(config.PROXY_DOMAINS_FILE, domains.join('\n'));
    
    logger.info(`更新了 ${domains.length} 个代理域名`);
    
    // 重置性能缓存
    Object.keys(domainPerformance).forEach(key => {
      delete domainPerformance[key];
    });
    
    return domains;
  } catch (err) {
    logger.error(`更新代理域名失败: ${err.message}`, { error: err.stack });
    throw err;
  }
};

/**
 * 获取所有代理域名
 */
const getProxyDomains = () => {
  return [...proxyDomains];
};

/**
 * 测试代理域名的响应时间
 */
const testDomainSpeed = async (domain) => {
  try {
    const startTime = Date.now();
    const testUrl = `https://${domain}/raw.githubusercontent.com/rdone4425/qita/refs/heads/main/test.txt`;
    
    const response = await axios.get(testUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'GitHub-Proxy-Service'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      domain,
      responseTime,
      status: response.status,
      success: true
    };
  } catch (err) {
    return {
      domain,
      responseTime: Infinity,
      status: err.response ? err.response.status : 0,
      success: false,
      error: err.message
    };
  }
};

/**
 * 获取最快的代理域名
 */
const getFastestDomain = async () => {
  // 如果没有代理域名，则返回null
  if (proxyDomains.length === 0) {
    return null;
  }
  
  // 检查缓存
  const cacheKey = 'fastest-domain';
  const cachedDomain = cacheGet(cacheKey);
  
  if (cachedDomain) {
    return cachedDomain;
  }
  
  // 测试所有域名的速度
  const results = await Promise.all(
    proxyDomains.map(domain => testDomainSpeed(domain))
  );
  
  // 过滤出成功的结果并按响应时间排序
  const successResults = results
    .filter(result => result.success)
    .sort((a, b) => a.responseTime - b.responseTime);
  
  // 如果没有成功的结果，则随机选择一个域名
  if (successResults.length === 0) {
    const randomDomain = proxyDomains[Math.floor(Math.random() * proxyDomains.length)];
    return randomDomain;
  }
  
  // 获取最快的域名
  const fastestDomain = successResults[0].domain;
  
  // 更新性能缓存
  successResults.forEach(result => {
    domainPerformance[result.domain] = {
      responseTime: result.responseTime,
      lastChecked: Date.now()
    };
  });
  
  // 缓存结果
  cacheSet(cacheKey, fastestDomain, config.PROXY_CACHE_DURATION);
  
  return fastestDomain;
};

/**
 * 获取随机代理域名
 */
const getRandomDomain = () => {
  if (proxyDomains.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * proxyDomains.length);
  return proxyDomains[randomIndex];
};

/**
 * 获取轮询代理域名
 */
const getRoundRobinDomain = () => {
  if (proxyDomains.length === 0) {
    return null;
  }
  
  const domain = proxyDomains[roundRobinIndex];
  roundRobinIndex = (roundRobinIndex + 1) % proxyDomains.length;
  return domain;
};

/**
 * 根据策略获取代理域名
 */
const getProxyDomain = async () => {
  switch (config.PROXY_STRATEGY) {
    case 'fastest':
      return await getFastestDomain();
    case 'random':
      return getRandomDomain();
    case 'round-robin':
      return getRoundRobinDomain();
    default:
      return await getFastestDomain();
  }
};

/**
 * 检查所有代理域名的健康状态
 */
const checkProxyHealth = async () => {
  try {
    // 测试所有域名的速度
    const results = await Promise.all(
      proxyDomains.map(domain => testDomainSpeed(domain))
    );
    
    // 统计结果
    const totalDomains = results.length;
    const healthyDomains = results.filter(result => result.success).length;
    const unhealthyDomains = totalDomains - healthyDomains;
    
    // 更新性能缓存
    results.forEach(result => {
      domainPerformance[result.domain] = {
        responseTime: result.success ? result.responseTime : Infinity,
        lastChecked: Date.now(),
        healthy: result.success
      };
    });
    
    // 如果健康的域名太少，尝试更新域名列表
    if (healthyDomains < totalDomains * 0.5 && totalDomains > 0) {
      logger.warn(`健康的代理域名数量过少 (${healthyDomains}/${totalDomains})，尝试更新域名列表`);
      try {
        await updateProxyDomains();
      } catch (err) {
        logger.error(`自动更新代理域名失败: ${err.message}`);
      }
    }
    
    return {
      总数: totalDomains,
      健康: healthyDomains,
      不健康: unhealthyDomains,
      详细: results.map(result => ({
        域名: result.domain,
        状态: result.success ? '健康' : '不健康',
        响应时间: result.success ? `${result.responseTime}ms` : null,
        HTTP状态: result.status,
        错误: result.error
      }))
    };
  } catch (err) {
    logger.error(`健康检查失败: ${err.message}`, { error: err.stack });
    throw err;
  }
};

/**
 * 定时健康检查
 */
const scheduleHealthCheck = () => {
  // 立即进行一次健康检查
  checkProxyHealth()
    .then(result => {
      logger.info(`初始健康检查完成: ${result.健康}/${result.总数} 个域名健康`);
    })
    .catch(err => {
      logger.error(`初始健康检查失败: ${err.message}`);
    });
  
  // 设置定时健康检查
  setInterval(() => {
    checkProxyHealth()
      .then(result => {
        logger.info(`定时健康检查完成: ${result.健康}/${result.总数} 个域名健康`);
      })
      .catch(err => {
        logger.error(`定时健康检查失败: ${err.message}`);
      });
  }, config.HEALTH_CHECK_INTERVAL);
};

/**
 * 根据文件大小确定需要的代理域名数量
 */
const getProxyCountByFileSize = (fileSize) => {
  if (!config.ENABLE_MULTI_PROXY) {
    return 1;
  }
  
  // 将字节转换为MB
  const fileSizeMB = fileSize / (1024 * 1024);
  
  if (fileSizeMB < config.SMALL_FILE_THRESHOLD) {
    return 1; // 小文件使用单一代理
  } else if (fileSizeMB < config.MEDIUM_FILE_THRESHOLD) {
    return 3; // 中等文件使用3个代理
  } else if (fileSizeMB < config.LARGE_FILE_THRESHOLD) {
    return 5; // 大文件使用5个代理
  } else {
    return 10; // 超大文件使用10个代理
  }
};

module.exports = {
  initProxyDomains,
  updateProxyDomains,
  getProxyDomains,
  getProxyDomain,
  checkProxyHealth,
  scheduleHealthCheck,
  getProxyCountByFileSize
};
