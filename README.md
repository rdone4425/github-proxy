# GitHub 资源加速代理服务

这是一个可以部署在服务器上的GitHub资源加速代理服务，基于Docker实现。它可以帮助你在网络受限的环境中快速访问GitHub上的资源。

## 功能特点

- 🚀 **极速代理**：自动选择最快的代理域名，加速 GitHub 资源访问
- 🔄 **多域名并行下载**：根据文件大小自动选择合适数量的代理域名，提高大文件下载速度
- 📊 **实时监控**：提供详细的流量统计和代理性能监控
- 🔍 **健康检查**：定期检查代理域名的可用性和性能
- 🛡️ **安全防护**：支持 token 认证，防止未授权访问
- 🔧 **灵活配置**：支持多种代理策略（最快、随机、轮询）
- 📦 **断点续传**：支持断点续传和多线程下载
- 🔄 **自动更新**：自动维护和更新代理域名列表
- 🐳 **Docker部署**：提供Docker一键部署，无需处理依赖问题

## 项目结构

```
github-proxy/
├── public/                 # 静态资源
│   ├── index.html          # 首页
│   ├── stats.html          # 监控统计页面
│   └── multi-download.html # 多域名并行下载页面
├── src/                    # 源代码
│   ├── config/             # 配置
│   │   └── index.js        # 配置管理
│   ├── controllers/        # 控制器
│   │   ├── github.js       # GitHub API 控制器
│   │   ├── proxy.js        # 代理控制器
│   │   └── stats.js        # 统计控制器
│   ├── middlewares/        # 中间件
│   │   ├── auth.js         # 认证中间件
│   │   └── logger.js       # 日志中间件
│   ├── routes/             # 路由
│   │   ├── api.js          # API 路由
│   │   ├── pages.js        # 页面路由
│   │   └── proxy.js        # 代理路由
│   ├── utils/              # 工具函数
│   │   ├── cache.js        # 缓存工具
│   │   ├── formatter.js    # 格式化工具
│   │   ├── proxy.js        # 代理工具
│   │   └── stats.js        # 统计工具
│   ├── app.js              # 应用程序
│   ├── index.js            # 主服务器入口
│   └── api-server.js       # API 服务器入口
├── .env                    # 环境变量
├── docker-compose.yml      # Docker Compose 配置
├── Dockerfile              # Docker 构建文件
├── docker-deploy.sh        # Docker 部署脚本
├── package.json            # 项目依赖
├── README.md               # 项目说明
└── README.docker.md        # Docker 部署指南
```

## 系统要求

- Docker 20.10.0 或更高版本
- Docker Compose v2.0.0 或更高版本
- 至少 512MB 内存
- 至少 1GB 磁盘空间

## 安装部署

### 方法一：使用一键部署脚本（推荐）

```bash
bash <(curl -Ls https://raw.githubusercontent.com/rdone4425/github-proxy/main/deploy.sh)
```

如果遇到下载问题，也可以使用以下备用命令：

```bash
# 先下载部署脚本
curl -Ls -o deploy.sh https://raw.githubusercontent.com/rdone4425/github-proxy/main/deploy.sh
# 添加执行权限
chmod +x deploy.sh
# 运行部署脚本
./deploy.sh
```

一键部署脚本会自动：
- 检查并安装Docker和Docker Compose（如果需要）
- 下载最新版本的GitHub代理服务代码
- 创建必要的目录和配置文件
- 生成随机安全令牌
- 构建并启动Docker容器
- 显示服务访问信息和使用示例

### 方法二：仅启动服务（已部署过）

如果你已经部署过服务，只需要启动它：

```bash
cd github-proxy
./docker-deploy.sh start
```

### 方法三：手动部署

```bash
# 下载代码
git clone https://github.com/rdone4425/github-proxy.git
cd github-proxy

# 创建必要的目录
mkdir -p data logs

# 创建配置文件（如果不存在）
cp .env.example .env  # 然后编辑 .env 文件设置你的配置

# 构建并启动容器
docker-compose up -d
```

## 更新服务

使用以下命令可以更新GitHub代理服务到最新版本：

```bash
# 使用更新脚本
./docker-update.sh

# 或者手动更新
git pull
docker-compose down
docker-compose up -d --build


```

## 配置说明

编辑`.env`文件来配置服务：

```
# 服务器配置
PORT=3000                # 主服务器端口
API_PORT=3001            # API服务器端口
NODE_ENV=production      # 运行环境

# 安全配置
SAFE_TOKEN=your_token    # 管理员token，用于访问管理API

# 缓存配置
CACHE_DURATION=300       # 缓存时间（秒）
PROXY_CACHE_DURATION=60000  # 代理缓存时间（毫秒）

# 代理配置
PROXY_STRATEGY=fastest   # 代理选择策略: fastest, random, round-robin

# 多域名并行下载配置
ENABLE_MULTI_PROXY=true  # 是否启用多域名并行下载
SMALL_FILE_THRESHOLD=5   # 小文件阈值（MB），小于此值使用单一代理
MEDIUM_FILE_THRESHOLD=50 # 中等文件阈值（MB），小于此值使用3个代理
LARGE_FILE_THRESHOLD=100 # 大文件阈值（MB），小于此值使用5个代理，大于此值使用10个代理

# 代理域名列表URL
PROXY_DOMAINS_URL=https://raw.githubusercontent.com/rdone4425/qita/refs/heads/main/proxy.txt

# 代理域名本地存储路径
PROXY_DOMAINS_FILE=./data/proxy.txt

# 健康检查配置
HEALTH_CHECK_INTERVAL=3600000  # 自动健康检查间隔（毫秒，默认1小时）

# Docker配置
DOCKER_MEMORY_LIMIT=512M  # Docker容器内存限制
DOCKER_CPU_LIMIT=1        # Docker容器CPU限制
```

## API接口说明

| 功能 | 请求方式 | 路径/示例 | 说明 |
|------|---------|-----------|------|
| 获取最快代理域名 | GET | `/api/proxy` | 返回最快可用代理域名 |
| 获取代理后的URL | GET | `/api/url?url=https://raw.githubusercontent.com/user/repo/main/file.txt` | 返回加速后的直链 |
| 直接代理下载 | GET | `/https://raw.githubusercontent.com/user/repo/main/file.txt` | 支持断点续传 |
| 获取仓库Releases | GET | `/api/releases?repo=user/repo` | 获取仓库发布列表 |
| 获取下载信息 | GET | `/api/download?url=https://raw.githubusercontent.com/user/repo/main/file.txt` | 返回加速直链及文件大小 |
| 多域名并行下载 | GET | `/api/multi-download?url=https://raw.githubusercontent.com/user/repo/main/file.txt&count=5` | 返回多个代理域名及分块信息 |
| 加速克隆仓库 | GET | `/api/clone?repo=https://github.com/user/repo.git` | 返回加速克隆命令 |
| 更新代理域名 | GET | `/api/update-domains?token=你的token` | 手动刷新代理域名列表 |
| 清除缓存 | GET | `/api/clear-cache?token=你的token` | 清除所有缓存 |
| 健康检查 | GET | `/api/health?token=你的token` | 检查所有代理域名的可用性 |
| 获取流量统计 | GET | `/api/stats?token=你的token` | 获取流量统计信息 |
| 重置流量统计 | GET | `/api/stats/reset?token=你的token` | 重置流量统计信息 |

## 管理Docker容器

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs
docker-compose logs -f  # 实时日志

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
git pull
docker-compose up -d --build
```

详细的Docker管理指南请参考 [Docker 部署指南](README.docker.md)。

## 使用Nginx反向代理

如果你想通过域名访问服务，可以使用Nginx进行反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 使用Docker部署

你也可以使用Docker来部署此服务，详细说明请参考 [Docker 部署指南](README.docker.md)：

```bash
# 使用一键部署脚本
chmod +x docker-deploy.sh
./docker-deploy.sh
```

## 许可证

MIT
