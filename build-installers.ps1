param(
  [switch]$Win,
  [switch]$Mac,
  [switch]$Linux,
  [switch]$AllPlatforms
)

Write-Host "JER1Suite build script"

# 使用镜像加速下载（可选）
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_DOWNLOAD_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
$env:NPM_CONFIG_ELECTRON_MIRROR = $env:ELECTRON_MIRROR
$env:NPM_CONFIG_REGISTRY = 'https://registry.npmmirror.com'

# 基础环境检查
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'Node.js not found. Please install Node.js and ensure it is in PATH.'; exit 1 }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Error 'npm not found. Please install Node.js/npm and ensure it is in PATH.'; exit 1 }

$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node.js version: $nodeVersion"
Write-Host "npm version: $npmVersion"

# 安装依赖
Write-Host 'Installing dependencies...'
if (Test-Path 'package-lock.json') {
  npm ci --prefer-offline
} else {
  npm install --prefer-offline
}
if ($LASTEXITCODE -ne 0) { Write-Error 'Dependency install failed'; exit 1 }

# 预下载 Electron 二进制（可忽略失败）
Write-Host 'Prefetch Electron binaries (optional)...'
node -e 'require("@electron/get").download(""+require("./package.json").devDependencies.electron).then(()=>console.log("electron cached")).catch(e=>console.log("prefetch skip:"+e.message))'

# 预下载 electron-builder 依赖（忽略失败继续）
Write-Host 'Prefetch electron-builder deps (optional)...'
npx electron-builder install-app-deps --arch=x64

# 生成打包所需图标（从 SVG 转换为 PNG/ICO）
if (-not (Test-Path 'build')) { New-Item -ItemType Directory -Path 'build' | Out-Null }
Write-Host 'Generating app icons (PNG & ICO) from assets/icon.svg...'
node scripts/generate-icons.js
if ($LASTEXITCODE -ne 0) { Write-Warning 'Icon generation failed, continuing with default icon.' }

# 若未指定平台，默认构建 Windows
if (-not $Win -and -not $Mac -and -not $Linux -and -not $AllPlatforms) { $Win = $true }

# Windows 构建
if ($Win -or $AllPlatforms) {
  Write-Host 'Start building Windows installer'
  npx electron-builder --win --publish=never
  if ($LASTEXITCODE -ne 0) { Write-Error ("Windows build failed (exit {0})" -f $LASTEXITCODE); exit $LASTEXITCODE }
  Write-Host 'Windows build done'
}

# macOS 构建（提示在 macOS 上执行）
if ($Mac -or $AllPlatforms) {
  Write-Warning 'Not macOS: skip macOS build (run on macOS with -Mac or -AllPlatforms)'
}

# Linux 构建
if ($Linux -or $AllPlatforms) {
  Write-Host 'Start building Linux package (may not be supported natively on this host)'
  npx electron-builder --linux --publish=never
  if ($LASTEXITCODE -ne 0) {
    Write-Warning ('Linux build failed (exit {0})' -f $LASTEXITCODE)
  }
  else {
    Write-Host 'Linux build done'
  }
}

# 列出输出
if (Test-Path 'dist') {
  Write-Host 'dist output:'
  Get-ChildItem dist | Format-Table Name, Length, LastWriteTime
}