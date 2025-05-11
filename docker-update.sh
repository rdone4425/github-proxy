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

# 备份数据
backup_data() {
  info "备份数据..."
  
  # 创建备份目录
  BACKUP_DIR="./backup/$(date +%Y%m%d%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # 备份配置文件
  if [ -f .env ]; then
    cp .env "$BACKUP_DIR/"
    success "配置文件已备份"
  fi
  
  # 备份数据目录
  if [ -d data ]; then
    cp -r data "$BACKUP_DIR/"
    success "数据目录已备份"
  fi
  
  # 备份日志目录
  if [ -d logs ]; then
    cp -r logs "$BACKUP_DIR/"
    success "日志目录已备份"
  fi
  
  success "数据备份完成，备份目录: $BACKUP_DIR"
}

# 拉取最新代码
pull_latest_code() {
  info "拉取最新代码..."
  
  # 检查是否在git仓库中
  if [ -d .git ]; then
    git pull
    if [ $? -eq 0 ]; then
      success "代码更新成功"
    else
      error "代码更新失败，请检查网络连接或手动更新"
      exit 1
    fi
  else
    error "当前目录不是git仓库，无法自动更新"
    info "请手动下载最新代码并替换"
    exit 1
  fi
}

# 更新服务
update_service() {
  info "更新服务..."
  
  # 停止并移除旧容器
  info "停止并移除旧容器..."
  $DOCKER_COMPOSE down
  
  # 构建并启动新容器
  info "构建并启动新容器..."
  $DOCKER_COMPOSE up -d --build
  
  # 检查服务是否成功启动
  if [ $? -eq 0 ]; then
    success "GitHub代理服务已成功更新!"
    
    # 获取本机IP地址
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    
    info "服务访问信息:"
    info "- 主服务: http://$IP_ADDRESS:3000"
    info "- API服务: http://$IP_ADDRESS:3001"
    
    # 显示管理Token
    if [ -f .env ]; then
      TOKEN=$(grep SAFE_TOKEN .env | cut -d '=' -f2)
      if [ ! -z "$TOKEN" ]; then
        info "- 管理Token: $TOKEN"
      fi
    fi
  else
    error "更新失败，请检查日志"
    $DOCKER_COMPOSE logs
    exit 1
  fi
}

# 主函数
main() {
  echo "===== GitHub代理服务Docker更新脚本 ====="
  
  # 检查环境
  check_docker
  check_docker_compose
  
  # 备份数据
  backup_data
  
  # 拉取最新代码
  pull_latest_code
  
  # 更新服务
  update_service
  
  echo "===== 更新完成 ====="
}

# 执行主函数
main
