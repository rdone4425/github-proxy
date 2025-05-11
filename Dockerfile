FROM node:16-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 从builder阶段创建生产镜像
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制源代码
COPY --chown=appuser:appgroup . .

# 创建数据和日志目录
RUN mkdir -p data logs && \
    chown -R appuser:appgroup data logs

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    API_PORT=3001 \
    TZ=Asia/Shanghai

# 安装基本工具
RUN apk add --no-cache curl wget tzdata ca-certificates

# 暴露端口
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 切换到非root用户
USER appuser

# 启动命令
CMD ["node", "src/index.js"]
