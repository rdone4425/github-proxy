#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
  info "检查Docker是否安装..."
  if ! command -v docker &> /dev/null; then
    error "Docker未安装，请先安装Docker"
    info "可以使用以下命令安装Docker:"
    info "curl -fsSL https://get.docker.com | sh"
    exit 1
  fi
  success "Docker已安装"
}

# 检查Docker Compose是否安装
check_docker_compose() {
  info "检查Docker Compose是否安装..."
  if ! command -v docker-compose &> /dev/null; then
    warning "Docker Compose未安装，尝试使用Docker Compose插件..."
    if ! docker compose version &> /dev/null; then
      error "Docker Compose未安装，请先安装Docker Compose"
      info "可以使用以下命令安装Docker Compose:"
      info "curl -L \"https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose"
      info "chmod +x /usr/local/bin/docker-compose"
      exit 1
    else
      info "检测到Docker Compose插件，将使用'docker compose'命令"
      DOCKER_COMPOSE="docker compose"
    fi
  else
    DOCKER_COMPOSE="docker-compose"
    success "Docker Compose已安装"
  fi
}

# 创建配置文件
create_env_file() {
  info "检查配置文件..."
  if [ ! -f .env ]; then
    info "未找到.env文件，创建默认配置..."

    # 生成随机token
    RANDOM_TOKEN=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)

    # 获取可用端口
    DEFAULT_PORT=3000
    DEFAULT_API_PORT=3001

    # 检查端口是否被占用
    if command -v netstat &> /dev/null; then
      if netstat -tuln | grep -q ":$DEFAULT_PORT "; then
        warning "端口 $DEFAULT_PORT 已被占用，尝试使用其他端口..."
        DEFAULT_PORT=3010
      fi

      if netstat -tuln | grep -q ":$DEFAULT_API_PORT "; then
        warning "端口 $DEFAULT_API_PORT 已被占用，尝试使用其他端口..."
        DEFAULT_API_PORT=3011
      fi
    fi

    cat > .env << EOF
# 服务器配置
PORT=$DEFAULT_PORT
API_PORT=$DEFAULT_API_PORT
NODE_ENV=production

# 安全配置
SAFE_TOKEN=$RANDOM_TOKEN

# 缓存配置
CACHE_DURATION=300
PROXY_CACHE_DURATION=60000

# 代理配置
PROXY_STRATEGY=fastest

# 多域名并行下载配置
ENABLE_MULTI_PROXY=true
SMALL_FILE_THRESHOLD=5
MEDIUM_FILE_THRESHOLD=50
LARGE_FILE_THRESHOLD=100

# 代理域名列表URL
PROXY_DOMAINS_URL=https://raw.githubusercontent.com/rdone4425/qita/refs/heads/main/proxy.txt

# 代理域名本地存储路径
PROXY_DOMAINS_FILE=./data/proxy.txt

# 健康检查配置
HEALTH_CHECK_INTERVAL=3600000

# Docker配置
DOCKER_MEMORY_LIMIT=512M
DOCKER_CPU_LIMIT=1
EOF
    success "已创建默认配置文件"
  else
    success "配置文件已存在"
  fi
}

# 创建必要的目录
create_directories() {
  info "创建必要的目录..."
  mkdir -p data logs backup

  # 设置目录权限
  chmod -R 755 data logs backup

  success "目录创建完成"
}

# 部署服务
deploy_service() {
  info "开始部署GitHub代理服务..."

  # 停止并移除旧容器
  info "停止并移除旧容器..."
  $DOCKER_COMPOSE down

  # 构建并启动新容器
  info "构建并启动新容器..."
  $DOCKER_COMPOSE up -d --build

  # 检查服务是否成功启动
  if [ $? -eq 0 ]; then
    success "GitHub代理服务已成功部署!"

    # 获取本机IP地址
    IP_ADDRESS=$(hostname -I | awk '{print $1}')

    # 获取配置的端口
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3000")
    API_PORT=$(grep "^API_PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3001")
    TOKEN=$(grep "^SAFE_TOKEN=" .env | cut -d '=' -f2 | tr -d ' ')

    info "服务访问信息:"
    info "- 主服务: http://$IP_ADDRESS:$PORT"
    info "- API服务: http://$IP_ADDRESS:$API_PORT"
    info "- 管理Token: $TOKEN"

    info "使用示例:"
    info "- 获取代理域名: http://$IP_ADDRESS:$PORT/api/proxy"
    info "- 代理下载: http://$IP_ADDRESS:$PORT/https://raw.githubusercontent.com/user/repo/main/file.txt"
    info "- 多域名并行下载: http://$IP_ADDRESS:$PORT/multi-download.html"
    info "- 流量统计: http://$IP_ADDRESS:$PORT/stats"

    # 检查容器健康状态
    info "检查容器健康状态..."
    sleep 5
    CONTAINER_STATUS=$($DOCKER_COMPOSE ps | grep github-proxy | grep -o "Up" || echo "")

    if [ "$CONTAINER_STATUS" = "Up" ]; then
      success "容器运行正常"
    else
      warning "容器可能未正常运行，请检查日志"
      $DOCKER_COMPOSE logs
    fi
  else
    error "部署失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
  fi
}

# 启动服务
start_service() {
  info "正在启动GitHub代理服务..."

  # 启动服务
  $DOCKER_COMPOSE up -d

  # 检查服务是否成功启动
  if [ $? -eq 0 ]; then
    success "GitHub代理服务已成功启动!"

    # 获取本机IP地址
    IP_ADDRESS=$(hostname -I | awk '{print $1}')

    # 获取配置的端口
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3000")
    API_PORT=$(grep "^API_PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3001")
    TOKEN=$(grep "^SAFE_TOKEN=" .env | cut -d '=' -f2 | tr -d ' ')

    info "服务访问信息:"
    info "- 主服务: http://$IP_ADDRESS:$PORT"
    info "- API服务: http://$IP_ADDRESS:$API_PORT"
    info "- 管理Token: $TOKEN"

    # 检查容器健康状态
    info "检查容器健康状态..."
    sleep 5
    CONTAINER_STATUS=$($DOCKER_COMPOSE ps | grep github-proxy | grep -o "Up" || echo "")

    if [ "$CONTAINER_STATUS" = "Up" ]; then
      success "容器运行正常"
    else
      warning "容器可能未正常运行，请检查日志"
      $DOCKER_COMPOSE logs
    fi
  else
    error "启动失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
  fi
}

# 停止服务
stop_service() {
  info "正在停止GitHub代理服务..."
  $DOCKER_COMPOSE down
  if [ $? -eq 0 ]; then
    success "GitHub代理服务已成功停止!"
  else
    error "停止失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
  fi
}

# 重启服务
restart_service() {
  info "正在重启GitHub代理服务..."
  $DOCKER_COMPOSE restart
  if [ $? -eq 0 ]; then
    success "GitHub代理服务已成功重启!"

    # 获取本机IP地址
    IP_ADDRESS=$(hostname -I | awk '{print $1}')

    # 获取配置的端口
    PORT=$(grep "^PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3000")
    API_PORT=$(grep "^API_PORT=" .env | cut -d '=' -f2 | tr -d ' ' || echo "3001")

    info "服务访问信息:"
    info "- 主服务: http://$IP_ADDRESS:$PORT"
    info "- API服务: http://$IP_ADDRESS:$API_PORT"
  else
    error "重启失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
  fi
}

# 查看日志
view_logs() {
  info "查看GitHub代理服务日志..."
  $DOCKER_COMPOSE logs $1
}

# 显示帮助信息
show_help() {
  echo "GitHub代理服务Docker部署脚本"
  echo ""
  echo "用法: $0 [命令]"
  echo ""
  echo "命令:"
  echo "  start       启动服务"
  echo "  stop        停止服务"
  echo "  restart     重启服务"
  echo "  logs        查看日志"
  echo "  logs -f     实时查看日志"
  echo "  status      查看服务状态"
  echo "  help        显示帮助信息"
  echo ""
  echo "如果不指定命令，则执行完整部署流程"
}

# 查看服务状态
check_status() {
  info "查看GitHub代理服务状态..."
  $DOCKER_COMPOSE ps
}

# 主函数
main() {
  echo "===== GitHub代理服务Docker部署脚本 ====="

  # 检查命令行参数
  case "$1" in
    start)
      # 只启动服务
      check_docker
      check_docker_compose
      start_service
      echo "===== 启动完成 ====="
      exit 0
      ;;
    stop)
      # 停止服务
      check_docker
      check_docker_compose
      stop_service
      echo "===== 停止完成 ====="
      exit 0
      ;;
    restart)
      # 重启服务
      check_docker
      check_docker_compose
      restart_service
      echo "===== 重启完成 ====="
      exit 0
      ;;
    logs)
      # 查看日志
      check_docker
      check_docker_compose
      view_logs "$2"
      exit 0
      ;;
    status)
      # 查看状态
      check_docker
      check_docker_compose
      check_status
      exit 0
      ;;
    help)
      # 显示帮助
      show_help
      exit 0
      ;;
  esac

  # 检查环境
  check_docker
  check_docker_compose

  # 准备部署
  create_directories
  create_env_file

  # 部署服务
  deploy_service

  echo "===== 部署完成 ====="
}

# 执行主函数
main "$@"
