#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 解析命令行参数
FORCE_RESTART=false
SHOW_HELP=false
START_API=false

for arg in "$@"; do
  case $arg in
    -f|--force)
      FORCE_RESTART=true
      shift
      ;;
    -h|--help)
      SHOW_HELP=true
      shift
      ;;
    -a|--api)
      START_API=true
      shift
      ;;
    *)
      # 未知参数
      ;;
  esac
done

# 显示帮助信息
if [ "$SHOW_HELP" = true ]; then
  echo "GitHub代理服务启动脚本"
  echo ""
  echo "用法: ./start.sh [选项]"
  echo ""
  echo "选项:"
  echo "  -f, --force    强制重启服务，即使已经在运行"
  echo "  -a, --api      同时启动API服务器"
  echo "  -h, --help     显示此帮助信息"
  echo ""
  exit 0
fi

# 打印带颜色的信息
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

# 检测Linux发行版
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        VER=$DISTRIB_RELEASE
    elif [ -f /etc/debian_version ]; then
        OS="Debian"
        VER=$(cat /etc/debian_version)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi

    # 转换为小写
    OS=$(echo "$OS" | tr '[:upper:]' '[:lower:]')

    info "检测到操作系统: $OS $VER"
}

# 安装Node.js和npm
install_nodejs() {
    info "正在安装Node.js和npm..."

    if [[ "$OS" == *"ubuntu"* ]] || [[ "$OS" == *"debian"* ]] || [[ "$OS" == *"mint"* ]]; then
        # Ubuntu/Debian系统
        info "使用apt安装Node.js和npm..."
        sudo apt update
        sudo apt install -y nodejs npm curl
    elif [[ "$OS" == *"centos"* ]] || [[ "$OS" == *"rhel"* ]] || [[ "$OS" == *"fedora"* ]]; then
        # CentOS/RHEL/Fedora系统
        info "使用dnf/yum安装Node.js和npm..."
        if command -v dnf &> /dev/null; then
            sudo dnf install -y nodejs npm curl
        else
            sudo yum install -y nodejs npm curl
        fi
    elif [[ "$OS" == *"arch"* ]]; then
        # Arch Linux
        info "使用pacman安装Node.js和npm..."
        sudo pacman -Sy nodejs npm curl
    elif [[ "$OS" == *"alpine"* ]]; then
        # Alpine Linux
        info "使用apk安装Node.js和npm..."
        sudo apk add nodejs npm curl
    else
        # 其他系统，使用NVM安装
        warning "无法识别的Linux发行版，尝试使用NVM安装Node.js..."
        install_nvm
        return
    fi

    # 验证安装
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        NODE_VERSION=$(node -v)
        NPM_VERSION=$(npm -v)
        success "Node.js ($NODE_VERSION) 和 npm ($NPM_VERSION) 安装成功"
    else
        warning "通过包管理器安装失败，尝试使用NVM安装..."
        install_nvm
    fi
}

# 使用NVM安装Node.js
install_nvm() {
    info "正在安装NVM (Node Version Manager)..."

    # 安装curl（如果需要）
    if ! command -v curl &> /dev/null; then
        if [[ "$OS" == *"ubuntu"* ]] || [[ "$OS" == *"debian"* ]] || [[ "$OS" == *"mint"* ]]; then
            sudo apt update && sudo apt install -y curl
        elif [[ "$OS" == *"centos"* ]] || [[ "$OS" == *"rhel"* ]] || [[ "$OS" == *"fedora"* ]]; then
            if command -v dnf &> /dev/null; then
                sudo dnf install -y curl
            else
                sudo yum install -y curl
            fi
        elif [[ "$OS" == *"arch"* ]]; then
            sudo pacman -Sy curl
        elif [[ "$OS" == *"alpine"* ]]; then
            sudo apk add curl
        else
            error "无法安装curl，请手动安装Node.js"
            exit 1
        fi
    fi

    # 下载并安装NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

    # 加载NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    # 安装最新的LTS版本
    if command -v nvm &> /dev/null; then
        nvm install --lts
        NODE_VERSION=$(node -v)
        NPM_VERSION=$(npm -v)
        success "通过NVM安装Node.js ($NODE_VERSION) 和 npm ($NPM_VERSION) 成功"
    else
        error "NVM安装失败，请手动安装Node.js"
        exit 1
    fi
}

# 确保目录存在
mkdir -p data logs

# 检测系统并安装依赖
detect_distro

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    warning "未找到Node.js，将自动安装..."
    install_nodejs
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    warning "未找到npm，将自动安装..."
    install_nodejs
fi

# 读取.env文件中的配置
if [ -f .env ]; then
    # 尝试读取SKIP_VERSION_CHECK配置
    SKIP_VERSION_CHECK=$(grep "SKIP_VERSION_CHECK=" .env | cut -d '=' -f 2 | tr -d ' ')
    # 尝试读取AUTO_ACCEPT_INSTALL配置
    AUTO_ACCEPT_INSTALL=$(grep "AUTO_ACCEPT_INSTALL=" .env | cut -d '=' -f 2 | tr -d ' ')
fi

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$NODE_MAJOR_VERSION" -lt 14 ] && [ "$SKIP_VERSION_CHECK" != "true" ]; then
    warning "Node.js版本 ($NODE_VERSION) 过低，建议使用v14或更高版本"

    if [ "$AUTO_ACCEPT_INSTALL" = "true" ]; then
        info "自动接受安装 (AUTO_ACCEPT_INSTALL=true)"
        REPLY="y"
    else
        read -p "是否继续安装? (y/n) " -n 1 -r
        echo
    fi

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 安装依赖
info "正在安装项目依赖..."
npm install

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)

# 如果Node.js版本低于12，安装兼容版本的依赖
if [ "$NODE_MAJOR_VERSION" -lt 12 ]; then
    warning "检测到Node.js版本较低 ($NODE_VERSION)，安装兼容版本的依赖..."

    # 安装兼容版本的express-rate-limit
    npm uninstall express-rate-limit
    npm install express-rate-limit@5.5.0

    # 安装兼容版本的axios
    npm uninstall axios
    npm install axios@0.21.4

    # 安装兼容版本的dotenv
    npm uninstall dotenv
    npm install dotenv@10.0.0

    # 安装兼容版本的http-proxy-middleware
    npm uninstall http-proxy-middleware
    npm install http-proxy-middleware@2.0.1

    success "已安装兼容版本的依赖"
fi

# 检查是否安装了PM2
if ! command -v pm2 &> /dev/null; then
    warning "未找到PM2，正在全局安装PM2..."

    # 尝试使用npm安装PM2
    if npm install -g pm2; then
        success "PM2安装成功"
    else
        # 如果npm安装失败，可能是权限问题，尝试使用sudo
        warning "使用npm安装PM2失败，尝试使用sudo安装..."
        if sudo npm install -g pm2; then
            success "使用sudo安装PM2成功"
        else
            error "PM2安装失败，请手动安装: sudo npm install -g pm2"
            exit 1
        fi
    fi
fi

# 检查是否有.env文件，如果没有则从示例创建
if [ ! -f .env ]; then
    warning "未找到.env文件，正在创建默认配置..."
    cat > .env << EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 安全配置
SAFE_TOKEN=your_admin_token_here

# 缓存配置
CACHE_DURATION=300

# 代理配置
PROXY_CACHE_DURATION=60000  # 代理缓存时间（毫秒）
PROXY_STRATEGY=fastest      # 代理选择策略: fastest, random, round-robin

# 多域名并行下载配置
ENABLE_MULTI_PROXY=true     # 是否启用多域名并行下载
SMALL_FILE_THRESHOLD=5      # 小文件阈值（MB），小于此值使用单一代理
MEDIUM_FILE_THRESHOLD=50    # 中等文件阈值（MB），小于此值使用3个代理
LARGE_FILE_THRESHOLD=100    # 大文件阈值（MB），小于此值使用5个代理，大于此值使用10个代理

# 代理域名列表URL
PROXY_DOMAINS_URL=https://raw.githubusercontent.com/rdone4425/qita/refs/heads/main/proxy.txt

# 代理域名本地存储路径
PROXY_DOMAINS_FILE=./data/proxy.txt

# 健康检查配置
HEALTH_CHECK_INTERVAL=3600000  # 自动健康检查间隔（毫秒，默认1小时）

# 安装配置
SKIP_VERSION_CHECK=true        # 是否跳过Node.js版本检查
AUTO_ACCEPT_INSTALL=true       # 是否自动接受安装提示
AUTO_RESTART=true              # 是否自动重启已存在的服务
EOF
    success "已创建默认.env配置文件"
fi

# 使用PM2启动应用
info "正在启动GitHub代理服务..."

# 检查是否已有同名进程在运行
if pm2 list | grep -q "github-proxy"; then
    if [ "$FORCE_RESTART" = true ]; then
        info "强制重启服务 (--force 选项)..."
        pm2 delete github-proxy
        pm2 start src/index.js --name "github-proxy" --log ./logs/github-proxy.log
    else
        # 检查.env文件中的AUTO_RESTART配置
        AUTO_RESTART=$(grep "AUTO_RESTART=" .env | cut -d '=' -f 2 | tr -d ' ')

        if [ "$AUTO_RESTART" = "true" ]; then
            info "自动重启服务 (AUTO_RESTART=true)..."
            pm2 delete github-proxy
            pm2 start src/index.js --name "github-proxy" --log ./logs/github-proxy.log
        else
            info "检测到github-proxy进程已存在"
            info "如需重启，请使用 './start.sh -f' 或设置 AUTO_RESTART=true"
            info "当前服务状态:"
            pm2 status github-proxy
            exit 0
        fi
    fi
else
    pm2 start src/index.js --name "github-proxy" --log ./logs/github-proxy.log
fi

# 启动API服务器（可选）
if [ "$START_API" = true ]; then
    info "正在启动GitHub代理API服务..."

    # 检查是否已有同名进程在运行
    if pm2 list | grep -q "github-proxy-api"; then
        info "检测到github-proxy-api进程已存在，将重新启动..."
        pm2 delete github-proxy-api
    fi

    pm2 start src/api-server.js --name "github-proxy-api" --log ./logs/github-proxy-api.log
fi

# 检查启动状态
if [ $? -eq 0 ]; then
    # 检查服务是否真的在运行
    if pm2 list | grep -q "github-proxy.*online"; then
        success "GitHub代理服务已成功启动!"
    else
        error "服务可能未正确启动，请检查PM2状态"
        pm2 list
        exit 1
    fi

    # 显示状态
    info "服务状态:"
    pm2 status github-proxy

    # 获取服务器IP地址
    PORT=$(grep "PORT=" .env | cut -d '=' -f 2)
    PORT=${PORT:-3000}

    # 尝试获取IPv4地址
    SERVER_IPV4=""
    if command -v ip &> /dev/null; then
        SERVER_IPV4=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)
    elif command -v ifconfig &> /dev/null; then
        SERVER_IPV4=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    else
        SERVER_IPV4=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    # 尝试获取IPv6地址
    SERVER_IPV6=""
    if command -v ip &> /dev/null; then
        SERVER_IPV6=$(ip -6 addr show scope global | grep -oP '(?<=inet6\s)[0-9a-fA-F:]+' | head -1)
    elif command -v ifconfig &> /dev/null; then
        SERVER_IPV6=$(ifconfig | grep -Eo 'inet6 (addr:)?([0-9a-fA-F:]+)' | grep -v '::1' | grep -oP '([0-9a-fA-F:]+)' | head -1)
    else
        SERVER_IPV6=$(hostname -I 2>/dev/null | grep -o '[0-9a-fA-F:]\+:[0-9a-fA-F:]\+' | head -1)
    fi

    success "服务已启动!"
    if [ ! -z "$SERVER_IPV4" ]; then
        info "IPv4访问地址: http://${SERVER_IPV4}:${PORT}"
    fi

    if [ ! -z "$SERVER_IPV6" ]; then
        info "IPv6访问地址: http://[${SERVER_IPV6}]:${PORT}"
    fi

    info "常用命令:"
    echo "  查看日志: pm2 logs github-proxy"
    echo "  停止服务: pm2 stop github-proxy"
    echo "  重启服务: pm2 restart github-proxy"
    echo "  设置开机自启: pm2 startup && pm2 save"
    echo ""
    info "如需修改端口，请编辑 .env 文件中的 PORT 值"
else
    error "服务启动失败，请检查日志获取更多信息"
    exit 1
fi
