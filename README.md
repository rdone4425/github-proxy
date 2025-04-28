# 导航网站 - Cloudflare Pages 版本

一个简单而功能强大的网站导航系统，帮助您组织和快速访问常用网站。

## 部署到 Cloudflare Pages

本项目已配置为可以直接部署到 Cloudflare Pages。

### 部署步骤

1. 在 Cloudflare Dashboard 中创建一个新的 Pages 项目
2. 连接您的 GitHub 仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`nav-site/frontend`
4. 点击部署按钮

### 项目结构

```
/
├── nav-site/
│   ├── frontend/           # 前端代码
│   │   ├── index.html      # 首页
│   │   ├── admin.html      # 管理页面
│   │   ├── functions/      # Cloudflare Pages Functions
│   │   │   └── api/        # API 函数
│   │   └── js/             # 前端JavaScript代码
│   └── public/             # 公共资源
│       ├── css/            # 样式文件
│       ├── js/             # 公共JavaScript
│       └── img/            # 图片资源
├── package.json            # 项目配置
└── wrangler.toml           # Cloudflare Pages 配置
```

## 功能特点

- 分类管理：支持父分类和子分类的多级分类结构
- 网站管理：添加、编辑和删除网站
- 网站信息获取：自动获取网站标题、描述和图标
- 响应式设计：适配各种屏幕尺寸
- 本地存储：使用浏览器本地存储保存数据
- Cloudflare Pages Functions：使用 Cloudflare Pages Functions 获取网站信息

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 后端：Cloudflare Pages Functions
- 数据存储：localStorage (浏览器本地存储)
