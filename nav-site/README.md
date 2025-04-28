# 导航网站

一个简单而功能强大的网站导航系统，帮助您组织和快速访问常用网站。

## 功能特点

- 分类管理：支持父分类和子分类的多级分类结构
- 网站管理：添加、编辑和删除网站
- 网站信息获取：自动获取网站标题、描述和图标
- 响应式设计：适配各种屏幕尺寸
- 本地存储：使用浏览器本地存储保存数据
- 可选后端：支持使用Express后端进行数据持久化和网站信息获取

## 目录结构

```
nav-site/
├── frontend/           # 前端代码
│   ├── index.html      # 首页
│   ├── admin.html      # 管理页面
│   └── js/             # 前端JavaScript代码
│       ├── index.js    # 首页脚本
│       └── admin.js    # 管理页面脚本
├── backend/            # 后端代码
│   ├── server.js       # Express服务器
│   ├── website-fetcher.js # 网站信息获取服务
│   └── package.json    # 后端依赖配置
└── public/             # 公共资源
    ├── css/            # 样式文件
    │   ├── style.css   # 主样式
    │   └── admin.css   # 管理页面样式
    ├── js/             # 公共JavaScript
    │   ├── api.js      # API接口
    │   └── utils.js    # 工具函数
    └── img/            # 图片资源
        └── default-favicon.png # 默认网站图标
```

## 使用方法

### 仅使用前端（无需后端）

1. 直接打开 `frontend/index.html` 文件即可使用
2. 数据将保存在浏览器的本地存储中

### 使用完整功能（包含后端）

1. 安装后端依赖：
   ```
   cd backend
   npm install
   ```

2. 启动后端服务器：
   ```
   npm start
   ```

3. 访问 `http://localhost:3000/frontend/index.html`

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 后端（可选）：Node.js, Express
- 数据存储：localStorage (前端), JSON文件 (后端)

## 自定义

- 网站标题和页脚文本可以在管理页面的"网站设置"选项卡中修改
- 样式可以通过修改 `public/css/style.css` 和 `public/css/admin.css` 文件进行自定义
