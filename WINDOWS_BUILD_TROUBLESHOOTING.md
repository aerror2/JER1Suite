# Windows 交叉编译故障排除指南
# Windows Cross-Compilation Troubleshooting Guide

## 问题描述 / Problem Description

在 macOS 上交叉编译 Windows 安装包后，在 Windows 系统上运行应用时出现以下错误：

When running the application on Windows after cross-compiling the Windows installer on macOS, the following error occurs:

```
Uncaught Exception: 
Error: 
...\579f0038-cd15-4c69-bd04-49bf8b4a3c94.tmp.node is not a valid Win32 application.
```

## 问题原因 / Root Cause

这个错误是由于 **native 模块交叉编译问题** 导致的：

This error is caused by **native module cross-compilation issues**:

1. **serialport 模块包含 native 代码**：`serialport` 模块使用 C++ 编写的 native 绑定来访问系统串口
   **serialport module contains native code**: The `serialport` module uses native C++ bindings to access system serial ports

2. **平台特定的二进制文件**：native 模块需要为目标平台（Windows）编译特定的 `.node` 文件
   **Platform-specific binaries**: Native modules require platform-specific `.node` files compiled for the target platform (Windows)

3. **交叉编译挑战**：在 macOS 上为 Windows 编译 native 模块需要特殊配置
   **Cross-compilation challenges**: Compiling native modules for Windows on macOS requires special configuration

## 解决方案 / Solutions

### 1. 更新的 package.json 配置 / Updated package.json Configuration

已在 `package.json` 中添加以下配置来强制重建 native 模块：

The following configuration has been added to `package.json` to force native module rebuilding:

```json
{
  "build": {
    "nodeGypRebuild": true,
    "buildDependenciesFromSource": true,
    "npmRebuild": true,
    "win": {
      "extraResources": [
        {
          "from": "node_modules/@serialport",
          "to": "node_modules/@serialport",
          "filter": ["**/*"]
        }
      ]
    }
  }
}
```

### 2. 专用重建脚本 / Dedicated Rebuild Script

创建了 `rebuild-for-windows.sh` 脚本来专门处理 Windows 交叉编译：

Created `rebuild-for-windows.sh` script to specifically handle Windows cross-compilation:

- 清理所有缓存和编译文件
- 设置正确的交叉编译环境变量
- 重新编译 serialport 模块
- 确保使用正确的 Electron 版本

### 3. 更新的构建脚本 / Updated Build Script

`build-windows-on-macos.sh` 现在包含：

`build-windows-on-macos.sh` now includes:

- 自动调用重建脚本
- 强制 electron-builder 重建 native 依赖
- 更好的错误处理和日志输出

## 使用方法 / Usage

### 重新构建 Windows 安装包 / Rebuild Windows Installer

```bash
# 运行更新后的构建脚本
./build-windows-on-macos.sh

# 或者先手动重建，再构建
./rebuild-for-windows.sh
./build-windows-on-macos.sh --skip-wine-check
```

### 验证修复 / Verify Fix

1. 在 macOS 上重新构建 Windows 安装包
2. 将生成的 `.exe` 文件传输到 Windows 系统
3. 安装并运行应用
4. 确认串口功能正常工作

## 技术细节 / Technical Details

### electron-builder 配置选项 / electron-builder Configuration Options

- `nodeGypRebuild: true` - 强制重建所有 native 模块
- `buildDependenciesFromSource: true` - 从源代码构建依赖
- `npmRebuild: true` - 运行 npm rebuild

### 环境变量 / Environment Variables

重建脚本设置以下环境变量来确保正确的交叉编译：

The rebuild script sets the following environment variables to ensure proper cross-compilation:

```bash
export npm_config_target_platform=win32
export npm_config_target_arch=x64
export npm_config_disturl=https://electronjs.org/headers
export npm_config_runtime=electron
export npm_config_build_from_source=true
```

## 预防措施 / Prevention

为避免类似问题，建议：

To prevent similar issues, it's recommended to:

1. **始终使用最新的构建脚本**：确保使用包含 native 模块重建逻辑的脚本
   **Always use the latest build scripts**: Ensure using scripts that include native module rebuild logic

2. **测试跨平台兼容性**：在目标平台上测试构建的应用
   **Test cross-platform compatibility**: Test built applications on target platforms

3. **保持依赖更新**：定期更新 electron-builder 和相关依赖
   **Keep dependencies updated**: Regularly update electron-builder and related dependencies

4. **使用 CI/CD**：考虑在实际的 Windows 环境中构建 Windows 版本
   **Use CI/CD**: Consider building Windows versions in actual Windows environments

## 常见问题 / Common Issues

### 1. `*.tmp.node is not a valid Win32 application`

**错误描述 / Error Description：**
```
Uncaught Exception:
Error: \\?\C:\Users\...\AppData\Local\Temp\...\serialport.tmp.node is not a valid Win32 application.
```

**原因 / Cause：**
- `serialport` 等 native 模块在 macOS 上被编译为 macOS 二进制文件
- 交叉编译时没有正确为 Windows 平台重建这些模块
- `serialport` and other native modules are compiled as macOS binaries on macOS
- Cross-compilation doesn't properly rebuild these modules for Windows platform

**解决方案 / Solution：**
1. 确保 `package.json` 中包含正确的 `electron-builder` 配置
2. 使用 `rebuild-for-windows.sh` 脚本重建 native 模块
3. 运行 `build-windows-on-macos.sh` 进行完整构建

### 2. `ModuleNotFoundError: No module named 'distutils'`

**错误描述 / Error Description：**
```
ModuleNotFoundError: No module named 'distutils'
gyp ERR! configure error
gyp ERR! stack Error: `gyp` failed with exit code: 1
```

**原因 / Cause：**
- Python 3.12+ 版本移除了 `distutils` 模块
- `node-gyp` 依赖 `distutils` 来编译 native 模块
- Python 3.12+ versions removed the `distutils` module
- `node-gyp` depends on `distutils` to compile native modules

**解决方案 / Solution：**
1. 安装 `setuptools`：`python3 -m pip install setuptools`
2. 或使用较旧版本的 Python（3.11 或更早）
3. 脚本会自动检测并尝试修复此问题
4. Install `setuptools`: `python3 -m pip install setuptools`
5. Or use an older Python version (3.11 or earlier)
6. The script will automatically detect and attempt to fix this issue

### 3. `bindings.node is not a valid Win32 application`

**错误描述 / Error Description：**
```
Uncaught Exception:
Error: \\?\C:\Users\...\AppData\Local\Temp\...\bindings.node is not a valid Win32 application.
```

**原因 / Cause：**
- Native 模块（如 `@serialport/bindings-cpp`）仍然是 macOS 版本，没有正确为 Windows 平台编译
- Native modules (like `@serialport/bindings-cpp`) are still macOS versions, not properly compiled for Windows platform

**解决方案 / Solution：**
1. 确保 `package.json` 中 `nodeGypRebuild: true` 和 `buildDependenciesFromSource: true`
2. 使用 `asarUnpack` 配置确保 native 模块不被打包到 asar 文件中
3. 设置正确的交叉编译环境变量
4. 清理所有缓存和预编译文件
5. Ensure `nodeGypRebuild: true` and `buildDependenciesFromSource: true` in `package.json`
6. Use `asarUnpack` configuration to ensure native modules are not packed into asar files
7. Set correct cross-compilation environment variables
8. Clean all caches and precompiled files

## 相关资源 / Related Resources

- [electron-builder 文档](https://www.electron.build/)
- [serialport 文档](https://serialport.io/)
- [Node.js native 模块文档](https://nodejs.org/api/addons.html)
- [electron 重建文档](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)