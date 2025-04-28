/**
 * 网站信息获取服务
 *
 * 这个模块用于获取网站的标题、描述、图标、关键词等信息
 * 支持特殊网站的定制处理，如YouTube、Twitter等
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// 默认请求配置
const DEFAULT_CONFIG = {
    timeout: 10000,
    maxRetries: 2,
    retryDelay: 1000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    }
};

/**
 * 特殊网站处理器
 */
const specialSiteHandlers = {
    // YouTube 视频页面处理
    'youtube.com': async (url, $, response) => {
        // 检查是否是视频页面
        if (url.includes('watch?v=')) {
            // 尝试获取视频标题
            const videoTitle = $('meta[property="og:title"]').attr('content') ||
                              $('meta[name="title"]').attr('content') ||
                              $('#container h1.title').text().trim();

            // 尝试获取视频描述
            const videoDescription = $('meta[property="og:description"]').attr('content') ||
                                    $('meta[name="description"]').attr('content');

            // 尝试获取视频缩略图
            const videoThumbnail = $('meta[property="og:image"]').attr('content') ||
                                  $('link[rel="image_src"]').attr('href');

            // 尝试获取频道信息
            const channelName = $('.ytd-channel-name a').text().trim() ||
                               $('meta[property="og:site_name"]').attr('content');

            return {
                title: videoTitle || 'YouTube 视频',
                description: videoDescription || '这是一个 YouTube 视频',
                favicon: 'https://www.youtube.com/favicon.ico',
                thumbnail: videoThumbnail,
                additionalInfo: {
                    type: 'video',
                    channel: channelName || 'YouTube'
                }
            };
        }

        // 频道页面处理
        if (url.includes('/channel/') || url.includes('/user/') || url.includes('/c/')) {
            const channelName = $('meta[property="og:title"]').attr('content') ||
                               $('meta[name="title"]').attr('content') ||
                               $('#channel-header #channel-name').text().trim();

            const channelDescription = $('meta[property="og:description"]').attr('content') ||
                                      $('meta[name="description"]').attr('content');

            const channelThumbnail = $('meta[property="og:image"]').attr('content');

            return {
                title: channelName || 'YouTube 频道',
                description: channelDescription || '这是一个 YouTube 频道',
                favicon: 'https://www.youtube.com/favicon.ico',
                thumbnail: channelThumbnail,
                additionalInfo: {
                    type: 'channel'
                }
            };
        }

        return null; // 返回null表示使用默认处理
    },

    // Twitter/X 处理
    'twitter.com': async (url, $, response) => {
        const tweetTitle = $('meta[property="og:title"]').attr('content');
        const tweetDescription = $('meta[property="og:description"]').attr('content');
        const tweetImage = $('meta[property="og:image"]').attr('content');

        if (tweetTitle || tweetDescription) {
            return {
                title: tweetTitle || 'Twitter',
                description: tweetDescription || '',
                favicon: 'https://twitter.com/favicon.ico',
                thumbnail: tweetImage,
                additionalInfo: {
                    type: 'tweet'
                }
            };
        }

        return null;
    },

    // 也支持X.com
    'x.com': async (url, $, response) => {
        return specialSiteHandlers['twitter.com'](url, $, response);
    },

    // GitHub 处理
    'github.com': async (url, $, response) => {
        // 仓库页面
        if (url.match(/github\.com\/[^\/]+\/[^\/]+\/?$/)) {
            const repoName = $('meta[property="og:title"]').attr('content');
            const repoDescription = $('meta[property="og:description"]').attr('content');
            const repoLanguage = $('.repository-lang-stats-graph .language-color').first().attr('aria-label');

            return {
                title: repoName || $('title').text().trim(),
                description: repoDescription || $('.f4.my-3').text().trim(),
                favicon: 'https://github.com/favicon.ico',
                additionalInfo: {
                    type: 'repository',
                    language: repoLanguage
                }
            };
        }

        return null;
    }
};

/**
 * 使用重试机制发送HTTP请求
 * @param {string} url - 请求的URL
 * @param {Object} config - 请求配置
 * @returns {Promise<Object>} - 响应对象
 */
async function fetchWithRetry(url, config = {}) {
    const { maxRetries, retryDelay, ...axiosConfig } = { ...DEFAULT_CONFIG, ...config };
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await axios.get(url, axiosConfig);
        } catch (error) {
            lastError = error;

            // 如果是最后一次尝试，则抛出错误
            if (attempt === maxRetries) {
                throw error;
            }

            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, retryDelay));

            // 增加重试延迟（指数退避）
            config.retryDelay = retryDelay * 2;
        }
    }

    throw lastError;
}

/**
 * 规范化URL
 * @param {string} url - 输入URL
 * @returns {string} - 规范化后的URL
 */
function normalizeUrl(url) {
    // 确保URL以http或https开头
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }

    try {
        // 创建URL对象并返回字符串形式
        const urlObj = new URL(url);
        return urlObj.toString();
    } catch (error) {
        // 如果URL无效，返回原始URL
        return url;
    }
}

/**
 * 将相对URL转换为绝对URL
 * @param {string} relativeUrl - 相对URL
 * @param {string} baseUrl - 基础URL
 * @returns {string} - 绝对URL
 */
function resolveUrl(relativeUrl, baseUrl) {
    if (!relativeUrl) return '';

    try {
        return new URL(relativeUrl, baseUrl).toString();
    } catch (error) {
        return '';
    }
}

/**
 * 获取网站信息
 * @param {string} url - 网站URL
 * @param {Object} options - 选项
 * @returns {Promise<Object>} - 包含网站信息的对象
 */
async function fetchWebsiteInfo(url, options = {}) {
    try {
        // 规范化URL
        const normalizedUrl = normalizeUrl(url);

        // 提取域名
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname;
        const baseDomain = domain.replace(/^www\./, '');

        // 合并配置
        const config = {
            ...DEFAULT_CONFIG,
            ...options
        };

        // 发送HTTP请求
        const response = await fetchWithRetry(normalizedUrl, config);

        // 使用Cheerio解析HTML
        const $ = cheerio.load(response.data);

        // 检查是否有特殊处理器
        for (const [siteDomain, handler] of Object.entries(specialSiteHandlers)) {
            if (baseDomain.includes(siteDomain)) {
                const specialResult = await handler(normalizedUrl, $, response);
                if (specialResult) {
                    return {
                        ...specialResult,
                        domain,
                        url: normalizedUrl
                    };
                }
                break;
            }
        }

        // 标准信息提取
        // 1. 标题提取 (按优先级)
        const title = $('meta[property="og:title"]').attr('content') ||
                     $('meta[name="twitter:title"]').attr('content') ||
                     $('meta[name="title"]').attr('content') ||
                     $('title').text().trim() ||
                     domain;

        // 2. 描述提取 (按优先级)
        const description = $('meta[property="og:description"]').attr('content') ||
                           $('meta[name="twitter:description"]').attr('content') ||
                           $('meta[name="description"]').attr('content') ||
                           $('meta[itemprop="description"]').attr('content') ||
                           '';

        // 3. 关键词提取
        const keywords = $('meta[name="keywords"]').attr('content') || '';

        // 4. 图标提取 (按优先级)
        let favicon = $('link[rel="apple-touch-icon"]').attr('href') ||
                     $('link[rel="apple-touch-icon-precomposed"]').attr('href') ||
                     $('link[rel="icon"]').attr('href') ||
                     $('link[rel="shortcut icon"]').attr('href') ||
                     '';

        // 如果没有找到图标，使用默认的favicon.ico路径
        if (!favicon) {
            favicon = `${urlObj.protocol}//${domain}/favicon.ico`;
        } else {
            // 将相对路径转换为绝对路径
            favicon = resolveUrl(favicon, normalizedUrl);
        }

        // 5. 缩略图提取
        const thumbnail = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content') ||
                         $('meta[itemprop="image"]').attr('content') ||
                         '';

        // 将相对路径转换为绝对路径
        const resolvedThumbnail = thumbnail ? resolveUrl(thumbnail, normalizedUrl) : '';

        // 6. 网站类型
        const siteType = $('meta[property="og:type"]').attr('content') || 'website';

        // 7. 网站名称
        const siteName = $('meta[property="og:site_name"]').attr('content') || '';

        // 构建结果对象
        const result = {
            title,
            description,
            favicon,
            domain,
            url: normalizedUrl,
            keywords,
            thumbnail: resolvedThumbnail,
            additionalInfo: {
                type: siteType,
                siteName
            }
        };

        return result;
    } catch (error) {
        console.error('获取网站信息失败:', error.message);

        // 返回基本信息而不是抛出错误，这样即使请求失败也能返回一些信息
        try {
            const urlObj = new URL(normalizeUrl(url));
            const domain = urlObj.hostname;

            return {
                title: domain,
                description: '',
                favicon: `${urlObj.protocol}//${domain}/favicon.ico`,
                domain,
                url: urlObj.toString(),
                error: error.message
            };
        } catch (parseError) {
            throw new Error('获取网站信息失败: ' + error.message);
        }
    }
}

/**
 * 批量获取多个网站的信息
 * @param {Array<string>} urls - 网站URL数组
 * @param {Object} options - 选项
 * @returns {Promise<Array<Object>>} - 包含多个网站信息的数组
 */
async function fetchMultipleWebsites(urls, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3; // 默认并发数

    // 创建任务队列
    const queue = [...urls];
    const pending = [];

    while (queue.length > 0 || pending.length > 0) {
        // 填充挂起的任务，直到达到并发限制
        while (pending.length < concurrency && queue.length > 0) {
            const url = queue.shift();

            // 创建一个Promise，在完成时从pending数组中移除自己
            const promise = fetchWebsiteInfo(url, options)
                .then(result => {
                    results.push(result);
                    return result;
                })
                .catch(error => {
                    console.error(`获取网站 ${url} 信息失败:`, error.message);
                    results.push({
                        url,
                        error: error.message
                    });
                })
                .finally(() => {
                    const index = pending.indexOf(promise);
                    if (index !== -1) {
                        pending.splice(index, 1);
                    }
                });

            pending.push(promise);
        }

        // 等待任意一个任务完成
        if (pending.length > 0) {
            await Promise.race(pending);
        }
    }

    return results;
}

// 导出函数
module.exports = {
    fetchWebsiteInfo,
    fetchMultipleWebsites,
    normalizeUrl,
    resolveUrl
};
