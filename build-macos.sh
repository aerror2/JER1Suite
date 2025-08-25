#!/bin/bash

# JER1Suite macOS build script
# 使用方法: ./build-macos.sh [--universal] [--x64] [--arm64]

set -e  # 遇到错误立即退出

echo "JER1Suite macOS build script"

# 解析命令行参数
BUILD_UNIVERSAL=false
BUILD_X64=false
BUILD_ARM64=false
DEFAULT_BUILD=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --universal)
      BUILD_UNIVERSAL=true
      DEFAULT_BUILD=false
      shift
      ;;
    --x64)
      BUILD_X64=true
      DEFAULT_BUILD=false
      shift
      ;;
    --arm64)
      BUILD_ARM64=true
      DEFAULT_BUILD=false
      shift
      ;;
    *)
      echo "未知参数: $1"
      echo "使用方法: $0 [--universal] [--x64] [--arm64]"
      exit 1
      ;;
  esac
done

# 如果没有指定架构，默认构建通用版本
if [ "$DEFAULT_BUILD" = true ]; then
  BUILD_UNIVERSAL=true
fi

# 使用镜像加速下载（可选）
export ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
export ELECTRON_DOWNLOAD_MIRROR='https://npmmirror.com/mirrors/electron/'
export ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
export NPM_CONFIG_ELECTRON_MIRROR="$ELECTRON_MIRROR"
export NPM_CONFIG_REGISTRY='https://registry.npmmirror.com'

# 基础环境检查
if ! command -v node &> /dev/null; then
  echo "错误: 未找到 Node.js。请安装 Node.js 并确保它在 PATH 中。"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "错误: 未找到 npm。请安装 Node.js/npm 并确保它在 PATH 中。"
  exit 1
fi

# 检查是否在 macOS 上运行
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "警告: 此脚本设计用于 macOS。当前系统: $OSTYPE"
  echo "macOS 应用程序最好在 macOS 上构建以确保兼容性。"
fi

node_version=$(node --version)
npm_version=$(npm --version)
echo "Node.js 版本: $node_version"
echo "npm 版本: $npm_version"

# 安装依赖
echo "正在安装依赖..."
if [ -f "package-lock.json" ]; then
  npm ci --prefer-offline
else
  npm install --prefer-offline
fi

if [ $? -ne 0 ]; then
  echo "错误: 依赖安装失败"
  exit 1
fi

# 预下载 Electron 二进制（可忽略失败）
echo "预下载 Electron 二进制文件（可选）..."
node -e 'require("@electron/get").download(""+require("./package.json").devDependencies.electron).then(()=>console.log("electron cached")).catch(e=>console.log("prefetch skip:"+e.message))' || true

# 预下载 electron-builder 依赖（忽略失败继续）
echo "预下载 electron-builder 依赖（可选）..."
npx electron-builder install-app-deps --arch=x64 || true

# 生成打包所需图标（从 SVG 转换为 PNG/ICNS）
if [ ! -d "build" ]; then
  mkdir -p build
fi

echo "从 assets/icon.svg 生成应用图标（PNG & ICNS）..."
node scripts/generate-icons.js || {
  echo "警告: 图标生成失败，将使用默认图标继续。"
}

# macOS 构建
if [ "$BUILD_UNIVERSAL" = true ]; then
  echo "开始构建 macOS 通用版本（x64 + arm64）"
  npx electron-builder --mac --universal --publish=never
  if [ $? -eq 0 ]; then
    echo "macOS 通用版本构建完成"
  else
    echo "错误: macOS 通用版本构建失败（退出码 $?）"
    exit $?
  fi
fi

if [ "$BUILD_X64" = true ]; then
  echo "开始构建 macOS x64 版本"
  npx electron-builder --mac --x64 --publish=never
  if [ $? -eq 0 ]; then
    echo "macOS x64 版本构建完成"
  else
    echo "错误: macOS x64 版本构建失败（退出码 $?）"
    exit $?
  fi
fi

if [ "$BUILD_ARM64" = true ]; then
  echo "开始构建 macOS arm64 版本"
  npx electron-builder --mac --arm64 --publish=never
  if [ $? -eq 0 ]; then
    echo "macOS arm64 版本构建完成"
  else
    echo "错误: macOS arm64 版本构建失败（退出码 $?）"
    exit $?
  fi
fi

# 列出输出
if [ -d "dist" ]; then
  echo "dist 输出:"
  ls -la dist/
else
  echo "警告: 未找到 dist 目录"
fi

echo "macOS 构建脚本执行完成！"