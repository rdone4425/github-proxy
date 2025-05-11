#!/bin/bash

# GitHub代理服务自动安装脚本
# 作者: Augment Agent
# 版本: 1.0.0
# 描述: 自动安装和配置GitHub代理服务

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
info() {
  echo -e "${BLUE}[INFO] $1${NC}"
}

success() {
  echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
  echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
  echo -e "${RED}[ERROR] $1${NC}"
}

# 检测操作系统
detect_os() {
  info "检测操作系统..."
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    info "检测到操作系统: $OS $VER"
  else
    error "无法检测操作系统"
    exit 1
  fi
}

# 检查并安装依赖
check_dependencies() {
  info "检查依赖..."
  
  # 检查curl
  if ! command -v curl &> /dev/null; then
    warning "curl未安装，正在安装..."
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      sudo apt-get update
      sudo apt-get install -y curl
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
      sudo yum install -y curl
    else
      error "不支持的操作系统: $OS"
      exit 1
    fi
  fi
  
  # 检查Node.js
  if ! command -v node &> /dev/null; then
    warning "Node.js未安装，正在安装..."
    
    # 根据不同的操作系统安装Node.js
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
      curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
      sudo yum install -y nodejs
    else
      error "不支持的操作系统: $OS"
      exit 1
    fi
    
    success "Node.js安装完成"
  else
    NODE_VERSION=$(node -v)
    info "Node.js已安装: $NODE_VERSION"
  fi
  
  # 检查npm
  if ! command -v npm &> /dev/null; then
    warning "npm未安装，正在安装..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      sudo apt-get install -y npm
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
      sudo yum install -y npm
    else
      error "不支持的操作系统: $OS"
      exit 1
    fi
    
    success "npm安装完成"
  else
    NPM_VERSION=$(npm -v)
    info "npm已安装: $NPM_VERSION"
  fi
  
  # 检查PM2
  if ! command -v pm2 &> /dev/null; then
    warning "PM2未安装，正在安装..."
    sudo npm install -g pm2
    success "PM2安装完成"
  else
    PM2_VERSION=$(pm2 -v)
    info "PM2已安装: $PM2_VERSION"
  fi
  
  # 检查unzip
  if ! command -v unzip &> /dev/null; then
    warning "unzip未安装，正在安装..."
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
      sudo apt-get install -y unzip
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
      sudo yum install -y unzip
    else
      error "不支持的操作系统: $OS"
      exit 1
    fi
    success "unzip安装完成"
  fi
}

# 下载项目
download_project() {
  info "下载GitHub代理服务..."
  
  # 创建安装目录
  INSTALL_DIR="${INSTALL_DIR:-/opt/github-proxy}"
  if [ -d "$INSTALL_DIR" ]; then
    warning "安装目录已存在，将备份旧文件..."
    BACKUP_DIR="$INSTALL_DIR.backup.$(date +%Y%m%d%H%M%S)"
    mv "$INSTALL_DIR" "$BACKUP_DIR"
    success "旧文件已备份到: $BACKUP_DIR"
  fi
  
  mkdir -p "$INSTALL_DIR"
  
  # 下载最新版本
  info "正在从GitHub下载最新版本..."
  
  # 使用代理下载
  PROXY_DOMAIN="${PROXY_DOMAIN:-gh.con.sh}"
  REPO_URL="${REPO_URL:-https://github.com/rdone4425/github-proxy/archive/refs/heads/main.zip}"
  DOWNLOAD_URL="https://$PROXY_DOMAIN/$REPO_URL"
  
  # 下载并解压
  TMP_FILE="/tmp/github-proxy.zip"
  info "使用代理下载: $DOWNLOAD_URL"
  if ! curl -L -o "$TMP_FILE" "$DOWNLOAD_URL"; then
    warning "代理下载失败，尝试直接从GitHub下载..."
    if ! curl -L -o "$TMP_FILE" "$REPO_URL"; then
      error "下载失败，请检查网络连接或手动下载"
      exit 1
    fi
  fi
  
  # 解压文件
  info "解压文件..."
  unzip -q "$TMP_FILE" -d "/tmp"
  
  # 获取解压后的目录名
  EXTRACTED_DIR=$(find /tmp -maxdepth 1 -type d -name "github-proxy*" | head -n 1)
  if [ -z "$EXTRACTED_DIR" ]; then
    error "解压失败，未找到github-proxy目录"
    exit 1
  fi
  
  cp -r "$EXTRACTED_DIR"/* "$INSTALL_DIR"
  rm -f "$TMP_FILE"
  rm -rf "$EXTRACTED_DIR"
  
  success "项目下载完成: $INSTALL_DIR"
}

# 安装项目
install_project() {
  info "安装GitHub代理服务..."
  
  # 进入安装目录
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  
  # 安装依赖
  info "安装依赖..."
  npm install --production
  
  # 创建配置文件
  if [ ! -f ".env" ]; then
    info "创建配置文件..."
    cp .env.example .env 2>/dev/null || touch .env
    
    # 生成随机token
    RANDOM_TOKEN=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
    
    cat > .env << EOF
# 服务器配置
PORT=3000
API_PORT=3001
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

# 安装配置
SKIP_VERSION_CHECK=true
AUTO_ACCEPT_INSTALL=true
AUTO_RESTART=true
EOF
    
    success "配置文件创建成功，管理员Token: $RANDOM_TOKEN"
  else
    info "配置文件已存在，跳过创建"
  fi
  
  # 创建数据目录
  mkdir -p data logs
  
  # 设置权限
  chmod +x start.sh
  
  success "项目安装完成"
}

# 启动服务
start_service() {
  info "启动GitHub代理服务..."
  
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  
  # 使用PM2启动服务
  ./start.sh -f -a
  
  # 设置开机自启
  info "设置开机自启..."
  pm2 startup
  pm2 save
  
  success "服务启动成功"
}

# 显示服务信息
show_service_info() {
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  
  # 获取配置信息
  PORT=$(grep "PORT=" .env | head -n 1 | cut -d '=' -f 2 | tr -d ' ')
  if [ -z "$PORT" ]; then
    PORT=3000
  fi
  
  SAFE_TOKEN=$(grep "SAFE_TOKEN=" .env | cut -d '=' -f 2 | tr -d ' ')
  
  # 获取服务器IP
  SERVER_IP=$(hostname -I | awk '{print $1}')
  
  echo ""
  echo "======================================"
  echo "  GitHub代理服务安装成功"
  echo "======================================"
  echo "  服务地址: http://$SERVER_IP:$PORT"
  echo "  监控页面: http://$SERVER_IP:$PORT/stats"
  echo "  多域名下载: http://$SERVER_IP:$PORT/multi-download"
  echo "  管理Token: $SAFE_TOKEN"
  echo "  配置文件: $INSTALL_DIR/.env"
  echo "  日志文件: $INSTALL_DIR/logs/github-proxy.log"
  echo ""
  echo "  使用以下命令管理服务:"
  echo "  - 查看状态: pm2 status"
  echo "  - 查看日志: pm2 logs github-proxy"
  echo "  - 重启服务: cd $INSTALL_DIR && ./start.sh -f"
  echo "  - 停止服务: pm2 stop github-proxy"
  echo "======================================"
}

# 主函数
main() {
  info "开始安装GitHub代理服务..."
  
  detect_os
  check_dependencies
  download_project
  install_project
  start_service
  show_service_info
  
  success "安装完成"
}

# 执行主函数
main
