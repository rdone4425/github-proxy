/**
 * API路由
 * 
 * 处理API请求
 */

const express = require('express');
const proxyController = require('../controllers/proxy');
const authMiddleware = require('../middlewares/auth');
const { updateProxyDomains, checkProxyHealth } = require('../utils/proxy');
const { clearCache } = require('../utils/cache');
const { getStats, resetStats } = require('../utils/stats');
const logger = require('../middlewares/logger');

const router = express.Router();

// 获取最快的代理域名
router.get('/proxy', proxyController.getFastestProxy);

// 获取代理后的URL
router.get('/url', proxyController.getProxyUrl);

// 获取下载信息
router.get('/download', proxyController.getDownloadInfo);

// 获取多域名并行下载信息
router.get('/multi-download', proxyController.getMultiDownloadInfo);

// 获取仓库发布列表
router.get('/releases', proxyController.getRepoReleases);

// 获取加速克隆命令
router.get('/clone', proxyController.getCloneCommand);

// 更新代理域名列表（需要认证）
router.get('/update-domains', authMiddleware, async (req, res) => {
  try {
    const domains = await updateProxyDomains();
    res.json({
      成功: true,
      消息: '代理域名列表已更新',
      数量: domains.length
    });
  } catch (err) {
    logger.error(`更新代理域名失败: ${err.message}`, { error: err.stack });
    res.status(500).json({
      成功: false,
      错误: `更新代理域名失败: ${err.message}`
    });
  }
});

// 健康检查（需要认证）
router.get('/health', authMiddleware, async (req, res) => {
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

// 清除缓存（需要认证）
router.get('/clear-cache', authMiddleware, (req, res) => {
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

// 获取统计信息（需要认证）
router.get('/stats', authMiddleware, (req, res) => {
  const stats = getStats();
  res.json({
    成功: true,
    统计: stats
  });
});

// 重置统计信息（需要认证）
router.get('/stats/reset', authMiddleware, (req, res) => {
  resetStats();
  res.json({
    成功: true,
    消息: '统计信息已重置'
  });
});

module.exports = router;
