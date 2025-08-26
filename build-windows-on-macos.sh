#!/bin/bash
# JER1Suite Windows Cross-Compilation Script for macOS
# 在 macOS 上交叉编译 Windows 安装包的专用脚本

# 默认参数
SKIP_WINE_CHECK=false
FORCE=false
ARCH="x64"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-wine-check)
      SKIP_WINE_CHECK=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --arch)
      ARCH="$2"
      shift 2
      ;;
    -h|--help)
      echo "用法: $0 [选项]"
      echo "Usage: $0 [options]"
      echo ""
      echo "选项 / Options:"
      echo "  --skip-wine-check    跳过 Wine 环境检查 / Skip Wine environment check"
      echo "  --force              强制继续构建 / Force continue build"
      echo "  --arch ARCH          指定架构 (默认: x64) / Specify architecture (default: x64)"
      echo "  -h, --help           显示此帮助信息 / Show this help message"
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      echo "Unknown option: $1"
      echo "使用 --help 查看帮助"
      echo "Use --help for help"
      exit 1
      ;;
  esac
done

echo -e "\033[32mJER1Suite Windows Cross-Compilation Script for macOS\033[0m"
echo -e "\033[32m在 macOS 上交叉编译 Windows 安装包\033[0m"

# 检查是否在 macOS 上运行
if [[ "$(uname)" != "Darwin" ]]; then
  echo -e "\033[31m错误: 此脚本仅适用于 macOS 系统。请在 macOS 上运行此脚本。\033[0m" >&2
  echo -e "\033[31mError: This script is designed for macOS only. Please run on macOS.\033[0m" >&2
  exit 1
fi

echo -e "\033[32m✓ 检测到 macOS 系统\033[0m"

# 使用镜像加速下载（可选）
export ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
export ELECTRON_DOWNLOAD_MIRROR='https://npmmirror.com/mirrors/electron/'
export ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
export NPM_CONFIG_ELECTRON_MIRROR="$ELECTRON_MIRROR"
export NPM_CONFIG_REGISTRY='https://registry.npmmirror.com'

# 基础环境检查
echo -e "\033[33m检查基础环境...\033[0m"
if ! command -v node &> /dev/null; then
  echo -e "\033[31m错误: Node.js 未找到。请安装 Node.js 并确保其在 PATH 中。\033[0m" >&2
  echo -e "\033[31mError: Node.js not found. Please install Node.js and ensure it is in PATH.\033[0m" >&2
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "\033[31m错误: npm 未找到。请安装 Node.js/npm 并确保其在 PATH 中。\033[0m" >&2
  echo -e "\033[31mError: npm not found. Please install Node.js/npm and ensure it is in PATH.\033[0m" >&2
  exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "\033[32m✓ Node.js version: $NODE_VERSION\033[0m"
echo -e "\033[32m✓ npm version: $NPM_VERSION\033[0m"

# 检查 Wine 环境（用于 Windows 交叉编译）
if [[ "$SKIP_WINE_CHECK" != "true" ]]; then
  echo -e "\033[33m检查 Wine 环境...\033[0m"
  
  if ! command -v wine &> /dev/null; then
    echo -e "\033[33m警告: Wine 未安装。Wine 是在 macOS 上构建 Windows 安装包所必需的。\033[0m" >&2
    echo -e "\033[33mWarning: Wine not installed. Wine is required for building Windows installers on macOS.\033[0m" >&2
    echo ""
    echo -e "\033[36m请运行以下命令安装 Wine:\033[0m"
    echo -e "\033[36mPlease run the following command to install Wine:\033[0m"
    echo -e "\033[37m  brew install --cask wine-stable\033[0m"
    echo -e "\033[36m或者:\033[0m"
    echo -e "\033[36mOr:\033[0m"
    echo -e "\033[37m  brew install wine\033[0m"
    echo ""
    
    if [[ "$FORCE" != "true" ]]; then
      echo -e "\033[31m错误: 请安装 Wine 后重新运行脚本，或使用 --force 参数强制继续（可能失败）。\033[0m" >&2
      echo -e "\033[31mError: Please install Wine and re-run the script, or use --force to continue anyway (may fail).\033[0m" >&2
      exit 1
    else
      echo -e "\033[33m警告: 使用 --force 参数，跳过 Wine 检查继续构建...\033[0m" >&2
      echo -e "\033[33mWarning: Using --force flag, skipping Wine check and continuing build...\033[0m" >&2
    fi
  else
    echo -e "\033[32m✓ Wine 已安装\033[0m"
    WINE_VERSION=$(wine --version 2>/dev/null || echo "unknown")
    echo -e "\033[32m✓ Wine version: $WINE_VERSION\033[0m"
  fi
fi

# 安装依赖
echo -e "\033[33m安装项目依赖...\033[0m"
echo -e "\033[33mInstalling project dependencies...\033[0m"

if [[ -f "package-lock.json" ]]; then
  npm ci --prefer-offline
else
  npm install --prefer-offline
fi

if [[ $? -ne 0 ]]; then
  echo -e "\033[31m错误: 依赖安装失败\033[0m" >&2
  echo -e "\033[31mError: Dependency installation failed\033[0m" >&2
  exit 1
fi

echo -e "\033[32m✓ 依赖安装完成\033[0m"

# 预下载 Electron 二进制（可忽略失败）
echo -e "\033[33m预下载 Electron 二进制文件...\033[0m"
echo -e "\033[33mPrefetching Electron binaries...\033[0m"

node -e 'require("@electron/get").download(""+require("./package.json").devDependencies.electron).then(()=>console.log("✓ Electron 缓存完成")).catch(e=>console.log("预下载跳过: "+e.message))' 2>/dev/null || true

# 为 Windows 交叉编译预下载依赖
echo -e "\033[33m预下载 Windows 构建依赖...\033[0m"
echo -e "\033[33mPrefetching Windows build dependencies...\033[0m"

npx electron-builder install-app-deps --platform=win32 --arch="$ARCH" 2>/dev/null || {
  echo -e "\033[33m警告: Windows 依赖预下载失败，继续构建...\033[0m" >&2
  echo -e "\033[33mWarning: Windows dependency prefetch failed, continuing build...\033[0m" >&2
}

# 准备 native 模块构建环境
echo -e "\033[33m准备 native 模块构建环境...\033[0m"
echo -e "\033[33mPreparing native module build environment...\033[0m"

# 修复 Python distutils 问题
echo -e "\033[33m检查 Python 环境...\033[0m"
if python3 -c "import distutils" 2>/dev/null; then
  echo -e "\033[32m✓ Python distutils 可用\033[0m"
else
  echo -e "\033[33m修复 Python distutils 问题...\033[0m"
  # 尝试安装 setuptools
  python3 -m pip install setuptools 2>/dev/null || {
    echo -e "\033[33m警告: 无法安装 setuptools，尝试使用系统 Python...\033[0m"
    # 设置使用系统 Python
    export PYTHON=$(which python3)
    npm config set python "$PYTHON"
  }
fi

# 清理缓存，让 electron-builder 重新构建
echo -e "\033[33m清理构建缓存...\033[0m"
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf ~/.electron 2>/dev/null || true
rm -rf ~/.cache/electron-builder 2>/dev/null || true

# 安装 electron-rebuild（如果没有的话）
if ! command -v electron-rebuild &> /dev/null; then
  echo -e "\033[33m安装 electron-rebuild...\033[0m"
  npm install --save-dev electron-rebuild --prefer-offline 2>/dev/null || true
fi

echo -e "\033[32m✓ 构建环境准备完成，electron-builder 将自动处理 native 模块重建\033[0m"

# 生成打包所需图标（从 SVG 转换为 PNG/ICO）
if [[ ! -d "build" ]]; then
  mkdir -p build
fi

echo -e "\033[33m生成应用图标...\033[0m"
echo -e "\033[33mGenerating app icons...\033[0m"

if [[ -f "scripts/generate-icons.js" ]]; then
  if node scripts/generate-icons.js; then
    echo -e "\033[32m✓ 图标生成完成\033[0m"
  else
    echo -e "\033[33m警告: 图标生成失败，使用默认图标继续。\033[0m" >&2
    echo -e "\033[33mWarning: Icon generation failed, continuing with default icon.\033[0m" >&2
  fi
else
  echo -e "\033[33m警告: 图标生成脚本未找到，跳过图标生成。\033[0m" >&2
  echo -e "\033[33mWarning: Icon generation script not found, skipping icon generation.\033[0m" >&2
fi

# 设置交叉编译环境变量
echo -e "\033[33m设置交叉编译环境...\033[0m"
echo -e "\033[33mSetting up cross-compilation environment...\033[0m"

# 设置 electron-builder 的交叉编译选项
export CSC_IDENTITY_AUTO_DISCOVERY="false"  # 禁用代码签名自动发现
unset WIN_CSC_LINK  # 清空 Windows 代码签名证书
unset WIN_CSC_KEY_PASSWORD  # 清空证书密码

echo -e "\033[32m✓ 交叉编译环境设置完成\033[0m"

# 开始构建 Windows 安装包
echo ""
echo -e "\033[35m开始构建 Windows 安装包...\033[0m"
echo -e "\033[35mStarting Windows installer build...\033[0m"
echo -e "\033[36m架构: $ARCH\033[0m"
echo -e "\033[36mArchitecture: $ARCH\033[0m"
echo ""

# 构建命令
BUILD_COMMAND="npx electron-builder --win --$ARCH --publish=never"

echo -e "\033[36m执行构建命令: $BUILD_COMMAND\033[0m"
echo -e "\033[36mExecuting build command: $BUILD_COMMAND\033[0m"

if ! $BUILD_COMMAND; then
  EXIT_CODE=$?
  echo -e "\033[31m错误: Windows 构建失败 (退出代码: $EXIT_CODE)\033[0m" >&2
  echo -e "\033[31mError: Windows build failed (exit code: $EXIT_CODE)\033[0m" >&2
  
  echo ""
  echo -e "\033[33m故障排除建议:\033[0m"
  echo -e "\033[33mTroubleshooting suggestions:\033[0m"
  echo -e "\033[37m1. 确保 Wine 正确安装并可用\033[0m"
  echo -e "\033[37m   Ensure Wine is properly installed and available\033[0m"
  echo -e "\033[37m2. 检查网络连接，确保可以下载构建依赖\033[0m"
  echo -e "\033[37m   Check network connection for downloading build dependencies\033[0m"
  echo -e "\033[37m3. 尝试清理 node_modules 并重新安装依赖\033[0m"
  echo -e "\033[37m   Try cleaning node_modules and reinstalling dependencies\033[0m"
  echo -e "\033[37m4. 检查 package.json 中的 electron-builder 配置\033[0m"
  echo -e "\033[37m   Check electron-builder configuration in package.json\033[0m"
  
  exit $EXIT_CODE
fi

echo ""
echo -e "\033[32m✓ Windows 构建完成!\033[0m"
echo -e "\033[32m✓ Windows build completed!\033[0m"

# 列出构建输出
if [[ -d "dist" ]]; then
  echo ""
  echo -e "\033[36m构建输出:\033[0m"
  echo -e "\033[36mBuild output:\033[0m"
  
  # 查找 Windows 安装包文件
  DIST_FILES=()
  while IFS= read -r -d '' file; do
    DIST_FILES+=("$file")
  done < <(find dist -maxdepth 1 -type f \( -name "*.exe" -o -name "*.msi" -o -name "*.zip" \) -print0 2>/dev/null)
  
  if [[ ${#DIST_FILES[@]} -gt 0 ]]; then
    echo ""
    printf "%-40s %-12s %s\n" "文件名/Name" "大小/Size(MB)" "修改时间/Modified"
    printf "%-40s %-12s %s\n" "----------" "----------" "----------"
    
    for file in "${DIST_FILES[@]}"; do
      filename=$(basename "$file")
      size_mb=$(du -m "$file" | cut -f1)
      modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || date -r "$file" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "unknown")
      printf "%-40s %-12s %s\n" "$filename" "${size_mb}MB" "$modified"
    done
    
    echo ""
    echo -e "\033[32mWindows 安装包已生成在 dist/ 目录中\033[0m"
    echo -e "\033[32mWindows installer has been generated in the dist/ directory\033[0m"
  else
    echo -e "\033[33m警告: 在 dist/ 目录中未找到 Windows 安装包文件\033[0m" >&2
    echo -e "\033[33mWarning: No Windows installer files found in dist/ directory\033[0m" >&2
    
    echo -e "\033[33m所有 dist/ 文件:\033[0m"
    echo -e "\033[33mAll dist/ files:\033[0m"
    ls -la dist/ 2>/dev/null || echo "无法列出 dist/ 目录内容"
  fi
else
  echo -e "\033[33m警告: dist/ 目录不存在\033[0m" >&2
  echo -e "\033[33mWarning: dist/ directory does not exist\033[0m" >&2
fi

echo ""
echo -e "\033[32m构建完成!\033[0m"
echo -e "\033[32mBuild completed!\033[0m"