#!/bin/bash

# GitHub代理服务一键部署脚本
# 作者: Augment Agent
# 版本: 1.0.0
# 描述: 一键部署GitHub代理服务

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
    warning "Docker未安装，尝试自动安装..."

    # 检测操作系统
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      OS=$ID
    else
      OS=$(uname -s)
    fi

    # 根据操作系统安装Docker
    case $OS in
      ubuntu|debian|linuxmint)
        info "检测到 $OS 系统，使用apt安装Docker..."
        sudo apt update
        sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo apt-key add -
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/$OS $(lsb_release -cs) stable"
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io
        ;;
      centos|rhel|fedora)
        info "检测到 $OS 系统，使用yum安装Docker..."
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/$OS/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
        sudo systemctl start docker
        sudo systemctl enable docker
        ;;
      *)
        info "使用通用安装脚本安装Docker..."
        curl -fsSL https://get.docker.com | sh
        ;;
    esac

    # 检查Docker是否安装成功
    if ! command -v docker &> /dev/null; then
      error "Docker安装失败，请手动安装Docker后重试"
      info "可以使用以下命令安装Docker: curl -fsSL https://get.docker.com | sh"
      exit 1
    fi

    # 将当前用户添加到docker组
    if [ "$EUID" -ne 0 ]; then
      info "将当前用户添加到docker组..."
      sudo usermod -aG docker $USER
      warning "您可能需要重新登录以应用组更改"
    fi

    success "Docker安装成功"
  else
    success "Docker已安装"
  fi
}

# 检查Docker Compose是否安装
check_docker_compose() {
  info "检查Docker Compose是否安装..."
  if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
      warning "Docker Compose未安装，尝试自动安装..."

      # 安装最新版本的Docker Compose
      COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

      # 如果无法获取最新版本，使用固定版本
      if [ -z "$COMPOSE_VERSION" ]; then
        COMPOSE_VERSION="v2.18.1"
      fi

      info "安装Docker Compose $COMPOSE_VERSION..."
      sudo curl -L "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      sudo chmod +x /usr/local/bin/docker-compose

      # 检查Docker Compose是否安装成功
      if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose安装失败，请手动安装Docker Compose后重试"
        exit 1
      fi

      success "Docker Compose安装成功"
      DOCKER_COMPOSE="docker-compose"
    else
      info "检测到Docker Compose插件，将使用'docker compose'命令"
      DOCKER_COMPOSE="docker compose"
    fi
  else
    DOCKER_COMPOSE="docker-compose"
    success "Docker Compose已安装"
  fi
}

# 下载代码
download_code() {
  info "下载GitHub代理服务代码..."

  # 设置安装目录
  INSTALL_DIR="${INSTALL_DIR:-$HOME/github-proxy}"
  info "安装目录: $INSTALL_DIR"

  # 如果安装目录已存在，询问是否覆盖
  if [ -d "$INSTALL_DIR" ]; then
    warning "安装目录已存在"
    read -p "是否覆盖现有安装? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      error "安装取消"
      exit 1
    fi

    # 备份现有安装
    BACKUP_DIR="$INSTALL_DIR.backup.$(date +%Y%m%d%H%M%S)"
    info "备份现有安装到: $BACKUP_DIR"
    mv "$INSTALL_DIR" "$BACKUP_DIR"
  fi

  # 确保安装目录存在
  mkdir -p "$INSTALL_DIR"

  # 创建临时目录
  TMP_DIR=$(mktemp -d)
  cd $TMP_DIR

  # 尝试使用git克隆
  if command -v git &> /dev/null; then
    info "使用git克隆代码..."

    # 尝试使用代理克隆
    if ! git clone https://github.com/rdone4425/github-proxy.git; then
      warning "git克隆失败，尝试使用其他方法下载..."
      USE_ALTERNATIVE=true
    else
      EXTRACTED_DIR="github-proxy"
    fi
  else
    warning "git未安装，尝试使用其他方法下载..."
    USE_ALTERNATIVE=true
  fi

  # 如果git克隆失败，尝试使用curl下载tar.gz文件
  if [ "$USE_ALTERNATIVE" = true ]; then
    info "尝试下载tar.gz文件..."

    # 使用多个代理域名尝试下载
    PROXY_DOMAINS=("gh.con.sh" "gh2.yanqishui.work" "download.nuaa.cf" "github.moeyy.xyz" "ghproxy.net")
    REPO_URL="https://github.com/rdone4425/github-proxy/archive/refs/heads/main.tar.gz"

    DOWNLOAD_SUCCESS=false

    for PROXY_DOMAIN in "${PROXY_DOMAINS[@]}"; do
      DOWNLOAD_URL="https://$PROXY_DOMAIN/$REPO_URL"
      info "尝试使用代理下载: $DOWNLOAD_URL"

      if curl -L -o github-proxy.tar.gz "$DOWNLOAD_URL"; then
        DOWNLOAD_SUCCESS=true
        break
      else
        warning "使用 $PROXY_DOMAIN 下载失败，尝试下一个代理..."
      fi
    done

    # 如果所有代理都失败，尝试直接从GitHub下载
    if [ "$DOWNLOAD_SUCCESS" = false ]; then
      warning "所有代理下载失败，尝试直接从GitHub下载..."
      if ! curl -L -o github-proxy.tar.gz "$REPO_URL"; then
        error "下载失败，请检查网络连接"
        exit 1
      fi
    fi

    # 解压tar.gz文件
    info "解压代码..."
    if ! tar -xzf github-proxy.tar.gz; then
      error "解压失败，下载的文件可能已损坏"
      exit 1
    fi

    # 获取解压后的目录名
    EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "github-proxy*" | head -n 1)
    if [ -z "$EXTRACTED_DIR" ]; then
      error "解压失败，未找到github-proxy目录"
      exit 1
    fi
  fi

  # 验证下载的代码
  if [ ! -f "$EXTRACTED_DIR/docker-deploy.sh" ]; then
    error "下载的代码不完整，缺少必要文件"
    exit 1
  fi

  # 复制文件
  info "复制文件到安装目录..."
  cp -r "$EXTRACTED_DIR"/* "$INSTALL_DIR"

  # 设置权限
  chmod +x "$INSTALL_DIR/docker-deploy.sh"
  chmod +x "$INSTALL_DIR/docker-update.sh"

  # 清理临时文件
  cd - > /dev/null
  rm -rf "$TMP_DIR"

  success "代码下载完成"
}

# 部署服务
deploy_service() {
  info "部署GitHub代理服务..."

  # 进入安装目录
  cd "$INSTALL_DIR"

  # 运行部署脚本
  info "运行部署脚本..."
  ./docker-deploy.sh

  success "部署完成"
}

# 主函数
main() {
  echo "===== GitHub代理服务一键部署脚本 ====="

  # 检查环境
  check_docker
  check_docker_compose

  # 下载代码
  download_code

  # 部署服务
  deploy_service

  echo "===== 部署完成 ====="
  echo "您可以使用以下命令管理服务:"
  echo "cd $INSTALL_DIR"
  echo "./docker-deploy.sh start    # 启动服务"
  echo "./docker-deploy.sh stop     # 停止服务"
  echo "./docker-deploy.sh restart  # 重启服务"
  echo "./docker-deploy.sh logs     # 查看日志"
  echo "./docker-deploy.sh status   # 查看状态"
}

# 执行主函数
main
