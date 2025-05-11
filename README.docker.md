# GitHub 代理服务 - Docker 部署指南

本文档提供了使用 Docker 部署 GitHub 代理服务的详细说明。通过 Docker 部署，你可以避免直接处理依赖问题，让部署更加简单和一致。

## 为什么选择Docker部署？

Docker部署相比直接部署有以下优势：

1. **环境隔离**：Docker容器提供了隔离的运行环境，避免了依赖冲突
2. **简化部署**：一键部署，无需手动安装Node.js和其他依赖
3. **一致性**：确保在任何支持Docker的系统上都能以相同方式运行
4. **易于管理**：提供了简单的命令来管理服务（启动、停止、重启等）
5. **数据持久化**：通过卷挂载保存配置和数据，即使容器重建也不会丢失
6. **自动健康检查**：内置健康检查确保服务正常运行
7. **安全性**：使用非root用户运行服务，提高安全性

## 系统要求

- Docker 20.10.0 或更高版本
- Docker Compose v2.0.0 或更高版本
- 至少 512MB 内存
- 至少 1GB 磁盘空间

## 快速部署

### 方法一：使用一键部署脚本（推荐）

```bash
# 下载代码
git clone https://github.com/rdone4425/github-proxy.git
cd github-proxy

# 给脚本添加执行权限
chmod +x docker-deploy.sh

# 运行部署脚本
./docker-deploy.sh
```

部署脚本提供了多种命令：

```bash
# 启动服务
./docker-deploy.sh start

# 停止服务
./docker-deploy.sh stop

# 重启服务
./docker-deploy.sh restart

# 查看日志
./docker-deploy.sh logs
./docker-deploy.sh logs -f  # 实时查看日志

# 查看服务状态
./docker-deploy.sh status

# 显示帮助信息
./docker-deploy.sh help
```

### 方法二：使用Docker Compose手动部署

```bash
# 下载代码
git clone https://github.com/rdone4425/github-proxy.git
cd github-proxy

# 创建必要的目录
mkdir -p data logs backup

# 创建配置文件（如果不存在）
cp .env.example .env  # 然后编辑 .env 文件设置你的配置

# 构建并启动容器
docker-compose up -d --build
```

## 配置说明

部署前，你可以编辑 `.env` 文件来自定义配置：

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
```

## 管理容器

### 使用部署脚本管理（推荐）

```bash
# 查看服务状态
./docker-deploy.sh status

# 查看日志
./docker-deploy.sh logs
./docker-deploy.sh logs -f  # 实时查看日志

# 重启服务
./docker-deploy.sh restart

# 停止服务
./docker-deploy.sh stop

# 启动服务
./docker-deploy.sh start
```

### 使用Docker Compose命令管理

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs
docker-compose logs -f  # 实时查看日志
docker-compose logs --tail=100  # 查看最近100行日志

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d
```

### 更新服务

```bash
# 使用更新脚本（推荐）
./docker-update.sh

# 或者手动更新
git pull
docker-compose down
docker-compose up -d --build
```

## 数据持久化

Docker 部署使用卷挂载来持久化数据：

- `./data:/app/data` - 存储代理域名列表和其他数据
- `./logs:/app/logs` - 存储日志文件
- `./.env:/app/.env` - 配置文件

这些目录会在宿主机上保留，即使容器被删除，数据也不会丢失。

## 自定义端口

如果你想更改默认端口，可以编辑 `docker-compose.yml` 文件：

```yaml
ports:
  - "8080:3000"  # 将主服务端口从3000改为8080
  - "8081:3001"  # 将API服务端口从3001改为8081
```

## 使用 Nginx 反向代理

如果你想通过域名访问服务，可以使用 Nginx 进行反向代理。以下是一个示例配置：

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

## 故障排除

### 容器无法启动

检查日志以获取详细错误信息：

```bash
# 使用部署脚本
./docker-deploy.sh logs

# 或者使用Docker Compose
docker-compose logs
```

### 无法连接到服务

1. 确认容器正在运行：`./docker-deploy.sh status` 或 `docker-compose ps`
2. 检查端口映射是否正确：`docker-compose port github-proxy 3000`
3. 检查防火墙设置，确保端口已开放
4. 检查配置文件中的端口设置是否正确

### 代理域名无法更新

1. 检查 `PROXY_DOMAINS_URL` 配置是否正确
2. 检查网络连接，确保容器可以访问外网
3. 手动触发更新：`curl http://localhost:3000/api/update-domains?token=YOUR_TOKEN`

### 容器健康检查失败

1. 检查服务是否正常运行：`docker inspect --format='{{.State.Health.Status}}' github-proxy`
2. 查看健康检查日志：`docker inspect --format='{{.State.Health.Log}}' github-proxy`
3. 重启容器：`./docker-deploy.sh restart` 或 `docker-compose restart`

## 性能优化

1. 调整容器资源限制（在 .env 中）：

```
# Docker配置
DOCKER_MEMORY_LIMIT=1G    # 增加内存限制
DOCKER_CPU_LIMIT=2        # 增加CPU限制
```

2. 调整缓存配置（在 .env 中）：

```
CACHE_DURATION=600       # 增加缓存时间
PROXY_CACHE_DURATION=120000  # 增加代理缓存时间
```

3. 优化日志配置（在 docker-compose.yml 中）：

```yaml
services:
  github-proxy:
    # ... 其他配置 ...
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
```

## 安全建议

1. 更改默认的 `SAFE_TOKEN` 为强密码
2. 不要将服务直接暴露在公网上，建议使用反向代理并添加额外的认证
3. 定期更新镜像以获取安全补丁
4. 使用非root用户运行容器（已在Dockerfile中配置）
5. 限制容器权限（已在docker-compose.yml中配置）
6. 使用HTTPS进行安全通信，可以通过Nginx反向代理实现

## 支持与反馈

如有问题或建议，请提交 Issue 到 GitHub 仓库。
