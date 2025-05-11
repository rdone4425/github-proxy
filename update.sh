#!/bin/bash

# GitHub代理服务更新脚本
# 作者: Augment Agent
# 版本: 1.0.0
# 描述: 更新已安装的GitHub代理服务

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

# 检查安装目录
check_installation() {
  INSTALL_DIR="${INSTALL_DIR:-/opt/github-proxy}"
  
  if [ ! -d "$INSTALL_DIR" ]; then
    error "安装目录不存在: $INSTALL_DIR"
    error "请先安装GitHub代理服务或指定正确的安装目录"
    exit 1
  fi
  
  if [ ! -f "$INSTALL_DIR/.env" ]; then
    error "配置文件不存在: $INSTALL_DIR/.env"
    error "安装可能已损坏，请重新安装"
    exit 1
  }
  
  info "检测到安装目录: $INSTALL_DIR"
}

# 备份配置
backup_config() {
  info "备份配置文件..."
  
  BACKUP_DIR="$INSTALL_DIR/backup/$(date +%Y%m%d%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # 备份.env文件
  if [ -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env" "$BACKUP_DIR/.env"
  fi
  
  # 备份代理域名文件
  if [ -f "$INSTALL_DIR/data/proxy.txt" ]; then
    mkdir -p "$BACKUP_DIR/data"
    cp "$INSTALL_DIR/data/proxy.txt" "$BACKUP_DIR/data/proxy.txt"
  fi
  
  success "配置文件已备份到: $BACKUP_DIR"
}

# 下载最新版本
download_latest() {
  info "下载最新版本..."
  
  # 使用代理下载
  PROXY_DOMAIN="${PROXY_DOMAIN:-gh.con.sh}"
  REPO_URL="${REPO_URL:-https://github.com/rdone4425/github-proxy/archive/refs/heads/main.zip}"
  DOWNLOAD_URL="https://$PROXY_DOMAIN/$REPO_URL"
  
  # 下载并解压
  TMP_FILE="/tmp/github-proxy-update.zip"
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
  TMP_DIR="/tmp/github-proxy-update"
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR"
  unzip -q "$TMP_FILE" -d "$TMP_DIR"
  
  # 获取解压后的目录名
  EXTRACTED_DIR=$(find "$TMP_DIR" -maxdepth 1 -type d -name "github-proxy*" | head -n 1)
  if [ -z "$EXTRACTED_DIR" ]; then
    error "解压失败，未找到github-proxy目录"
    exit 1
  fi
  
  success "下载完成"
  
  return 0
}

# 更新文件
update_files() {
  info "更新文件..."
  
  # 停止服务
  info "停止服务..."
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  pm2 stop github-proxy github-proxy-api
  
  # 备份当前版本
  CURRENT_BACKUP="$INSTALL_DIR.current.backup"
  rm -rf "$CURRENT_BACKUP"
  cp -r "$INSTALL_DIR" "$CURRENT_BACKUP"
  
  # 复制新文件，但保留配置
  find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -not -name ".env" -not -name "data" -not -name "logs" -not -name "backup" -exec rm -rf {} \;
  cp -r "$EXTRACTED_DIR"/* "$INSTALL_DIR"
  
  # 清理临时文件
  rm -f "$TMP_FILE"
  rm -rf "$TMP_DIR"
  
  # 设置权限
  chmod +x "$INSTALL_DIR/start.sh"
  chmod +x "$INSTALL_DIR/update.sh"
  
  success "文件更新完成"
}

# 更新依赖
update_dependencies() {
  info "更新依赖..."
  
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  npm install --production
  
  success "依赖更新完成"
}

# 启动服务
restart_service() {
  info "重启服务..."
  
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  ./start.sh -f -a
  
  success "服务已重启"
}

# 显示更新信息
show_update_info() {
  cd "$INSTALL_DIR" || { error "无法进入安装目录"; exit 1; }
  
  # 获取配置信息
  PORT=$(grep "PORT=" .env | head -n 1 | cut -d '=' -f 2 | tr -d ' ')
  if [ -z "$PORT" ]; then
    PORT=3000
  fi
  
  # 获取服务器IP
  SERVER_IP=$(hostname -I | awk '{print $1}')
  
  echo ""
  echo "======================================"
  echo "  GitHub代理服务更新成功"
  echo "======================================"
  echo "  服务地址: http://$SERVER_IP:$PORT"
  echo "  监控页面: http://$SERVER_IP:$PORT/stats"
  echo "  多域名下载: http://$SERVER_IP:$PORT/multi-download"
  echo "  配置文件: $INSTALL_DIR/.env"
  echo "  日志文件: $INSTALL_DIR/logs/github-proxy.log"
  echo ""
  echo "  如果更新后出现问题，可以恢复备份:"
  echo "  - 备份目录: $CURRENT_BACKUP"
  echo "======================================"
}

# 主函数
main() {
  info "开始更新GitHub代理服务..."
  
  check_installation
  backup_config
  download_latest
  update_files
  update_dependencies
  restart_service
  show_update_info
  
  success "更新完成"
}

# 执行主函数
main
