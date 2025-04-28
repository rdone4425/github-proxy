/**
 * 网站信息获取 API
 * 
 * 这个 Cloudflare Pages Function 用于获取网站的标题、描述和图标等信息
 */

export async function onRequest(context) {
  // 获取请求参数
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // 检查 URL 参数
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: '缺少URL参数' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // 发送请求获取网页内容
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`获取网页失败: ${response.status} ${response.statusText}`);
    }

    // 获取响应文本
    const html = await response.text();

    // 解析 HTML
    const title = extractTitle(html);
    const description = extractDescription(html);
    const favicon = extractFavicon(html, targetUrl);

    // 返回结果
    return new Response(JSON.stringify({
      title,
      description,
      favicon,
      url: targetUrl
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    // 返回错误信息
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// 提取网页标题
function extractTitle(html) {
  // 尝试从 Open Graph 标签中提取标题
  const ogTitleMatch = html.match(/<meta\\s+property=["\']og:title["\']\\s+content=["\'](.*?)["\']/i);
  if (ogTitleMatch) return ogTitleMatch[1];

  // 尝试从 Twitter 标签中提取标题
  const twitterTitleMatch = html.match(/<meta\\s+name=["\']twitter:title["\']\\s+content=["\'](.*?)["\']/i);
  if (twitterTitleMatch) return twitterTitleMatch[1];

  // 尝试从标题标签中提取标题
  const titleMatch = html.match(/<title>(.*?)<\\/title>/i);
  if (titleMatch) return titleMatch[1];

  // 如果都没有找到，返回空字符串
  return '';
}

// 提取网页描述
function extractDescription(html) {
  // 尝试从 Open Graph 标签中提取描述
  const ogDescMatch = html.match(/<meta\\s+property=["\']og:description["\']\\s+content=["\'](.*?)["\']/i);
  if (ogDescMatch) return ogDescMatch[1];

  // 尝试从 Twitter 标签中提取描述
  const twitterDescMatch = html.match(/<meta\\s+name=["\']twitter:description["\']\\s+content=["\'](.*?)["\']/i);
  if (twitterDescMatch) return twitterDescMatch[1];

  // 尝试从描述标签中提取描述
  const descMatch = html.match(/<meta\\s+name=["\']description["\']\\s+content=["\'](.*?)["\']/i);
  if (descMatch) return descMatch[1];

  // 如果都没有找到，返回空字符串
  return '';
}

// 提取网站图标
function extractFavicon(html, baseUrl) {
  // 尝试从 link 标签中提取图标
  const linkMatch = html.match(/<link\\s+rel=["\'](?:shortcut\\s+)?icon["\']\\s+(?:href=["\'](.*?)["\'](.*?)>|.*?href=["\'](.*?)["\'](.*?)>)/i);
  
  if (linkMatch) {
    const faviconUrl = linkMatch[1] || linkMatch[3];
    return resolveUrl(faviconUrl, baseUrl);
  }

  // 如果没有找到，尝试使用默认的 favicon.ico 路径
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.hostname}/favicon.ico`;
  } catch (e) {
    return '';
  }
}

// 解析相对 URL
function resolveUrl(relativeUrl, baseUrl) {
  try {
    // 如果是绝对 URL，直接返回
    if (relativeUrl.match(/^https?:\\/\\//i)) {
      return relativeUrl;
    }

    // 解析基础 URL
    const base = new URL(baseUrl);

    // 如果是根路径 URL
    if (relativeUrl.startsWith('/')) {
      return `${base.protocol}//${base.hostname}${relativeUrl}`;
    }

    // 如果是相对路径 URL
    // 移除 URL 中的查询参数和锚点
    let basePath = base.pathname;
    if (!basePath.endsWith('/')) {
      basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    }

    return `${base.protocol}//${base.hostname}${basePath}${relativeUrl}`;
  } catch (e) {
    return relativeUrl;
  }
}
