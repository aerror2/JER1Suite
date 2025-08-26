#!/bin/bash
# 清理和重建脚本 - 专门用于解决 Windows 交叉编译中的 native 模块问题

echo -e "\033[32m清理和重建 native 模块以支持 Windows 交叉编译\033[0m"
echo -e "\033[32mCleaning and rebuilding native modules for Windows cross-compilation\033[0m"

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

# 清理缓存和临时文件
echo -e "\033[33m清理缓存...\033[0m"
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf ~/.electron 2>/dev/null || true
rm -rf ~/.cache/electron 2>/dev/null || true
rm -rf ~/.cache/electron-builder 2>/dev/null || true

# 清理 serialport 相关的编译文件
echo -e "\033[33m清理 serialport 编译文件...\033[0m"
find node_modules/@serialport -name "*.node" -delete 2>/dev/null || true
find node_modules/@serialport -name "build" -type d -exec rm -rf {} + 2>/dev/null || true

# 重新安装依赖
echo -e "\033[33m重新安装依赖...\033[0m"
npm ci --prefer-offline

# 设置交叉编译环境变量
export npm_config_target_platform=win32
export npm_config_target_arch=x64
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_cache=/tmp/.npm
export npm_config_build_from_source=true

# 获取 electron 版本
ELECTRON_VERSION=$(node -p "require('./package.json').devDependencies.electron.replace('^', '')")
export npm_config_target=$ELECTRON_VERSION

echo -e "\033[33m使用 Electron 版本: $ELECTRON_VERSION\033[0m"
echo -e "\033[33mUsing Electron version: $ELECTRON_VERSION\033[0m"

# 重建 serialport
echo -e "\033[33m重建 serialport...\033[0m"

# 检查 serialport bindings-cpp 目录是否存在
if [[ -d "node_modules/@serialport/bindings-cpp" ]]; then
  cd node_modules/@serialport/bindings-cpp
  
  # 检查是否有 binding.gyp 文件
  if [[ -f "binding.gyp" ]]; then
    echo -e "\033[33m在 bindings-cpp 目录中重建...\033[0m"
    npm run rebuild --if-present 2>/dev/null || {
      echo -e "\033[33m尝试手动重建 serialport...\033[0m"
      node-gyp rebuild --target=$ELECTRON_VERSION --arch=x64 --dist-url=https://electronjs.org/headers 2>/dev/null || true
    }
  else
    echo -e "\033[33m警告: binding.gyp 文件未找到，跳过手动重建\033[0m"
  fi
  
  cd ../../../
else
  echo -e "\033[33m警告: @serialport/bindings-cpp 目录未找到\033[0m"
fi

# 尝试使用 electron-rebuild 重建所有 native 模块
echo -e "\033[33m使用 electron-rebuild 重建所有 native 模块...\033[0m"
if command -v electron-rebuild &> /dev/null; then
  electron-rebuild --version=$ELECTRON_VERSION --arch=x64 2>/dev/null || {
    echo -e "\033[33m警告: electron-rebuild 失败，将依赖 electron-builder 自动处理\033[0m"
  }
else
  echo -e "\033[33m安装 electron-rebuild...\033[0m"
  npm install --save-dev electron-rebuild 2>/dev/null || true
  
  if command -v electron-rebuild &> /dev/null; then
    electron-rebuild --version=$ELECTRON_VERSION --arch=x64 2>/dev/null || {
      echo -e "\033[33m警告: electron-rebuild 失败，将依赖 electron-builder 自动处理\033[0m"
    }
  fi
fi

echo -e "\033[32m✓ 重建完成\033[0m"
echo -e "\033[32m✓ Rebuild completed\033[0m"