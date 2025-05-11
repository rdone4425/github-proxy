#!/bin/bash

# GitHub代理服务卸载脚本
# 作者: Augment Agent
# 版本: 1.0.0
# 描述: 卸载GitHub代理服务

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
    warning "安装目录不存在: $INSTALL_DIR"
    read -p "是否继续卸载? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
    return
  fi
  
  info "检测到安装目录: $INSTALL_DIR"
}

# 停止服务
stop_service() {
  info "停止服务..."
  
  if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "github-proxy"; then
      pm2 stop github-proxy
      pm2 delete github-proxy
    fi
    
    if pm2 list | grep -q "github-proxy-api"; then
      pm2 stop github-proxy-api
      pm2 delete github-proxy-api
    fi
    
    # 保存PM2配置
    pm2 save
    
    success "服务已停止"
  else
    warning "PM2未安装，跳过停止服务"
  fi
}

# 备份配置
backup_config() {
  if [ ! -d "$INSTALL_DIR" ]; then
    return
  fi
  
  info "备份配置文件..."
  
  BACKUP_DIR="/tmp/github-proxy-backup-$(date +%Y%m%d%H%M%S)"
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

# 删除文件
remove_files() {
  if [ ! -d "$INSTALL_DIR" ]; then
    return
  }
  
  info "删除文件..."
  
  # 询问是否保留数据
  read -p "是否保留数据和日志? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 只删除程序文件，保留数据和日志
    find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 -not -name "data" -not -name "logs" -not -name "backup" -exec rm -rf {} \;
    success "程序文件已删除，数据和日志已保留"
  else
    # 删除整个目录
    rm -rf "$INSTALL_DIR"
    success "所有文件已删除"
  fi
}

# 删除开机自启
remove_startup() {
  info "删除开机自启..."
  
  if command -v pm2 &> /dev/null; then
    pm2 unstartup
    success "开机自启已删除"
  else
    warning "PM2未安装，跳过删除开机自启"
  fi
}

# 询问是否卸载PM2
ask_remove_pm2() {
  if command -v pm2 &> /dev/null; then
    read -p "是否卸载PM2? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      info "卸载PM2..."
      npm uninstall -g pm2
      success "PM2已卸载"
    fi
  fi
}

# 显示卸载信息
show_uninstall_info() {
  echo ""
  echo "======================================"
  echo "  GitHub代理服务卸载成功"
  echo "======================================"
  if [ -d "$BACKUP_DIR" ]; then
    echo "  配置备份: $BACKUP_DIR"
  fi
  echo "======================================"
}

# 主函数
main() {
  info "开始卸载GitHub代理服务..."
  
  check_installation
  backup_config
  stop_service
  remove_files
  remove_startup
  ask_remove_pm2
  show_uninstall_info
  
  success "卸载完成"
}

# 执行主函数
main
