const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('Running before-build script...');
  
  // 检查是否为 Windows 构建
  if (context.platform.name === 'windows') {
    console.log('Preparing Windows build...');
    
    try {
      // Force rebuild of native modules for Windows
      console.log('Rebuilding native modules for Windows...');
      
      // Use electron-rebuild to rebuild native modules
      const electronRebuildCmd = process.platform === 'win32' 
        ? '.\\node_modules\\.bin\\electron-rebuild.cmd'
        : './node_modules/.bin/electron-rebuild';
      
      execSync(electronRebuildCmd, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✓ Native modules rebuilt successfully');
      
    } catch (error) {
      console.log('⚠ electron-rebuild failed, continuing with build...');
      console.log('Error:', error.message);
      
      // 检查 serialport bindings 是否存在
      const bindingsPath = path.join(__dirname, '..', 'node_modules', '@serialport', 'bindings-cpp');
      
      if (fs.existsSync(bindingsPath)) {
        console.log('Found @serialport/bindings-cpp, checking for native bindings...');
        
        // Check for native bindings
        const nativeBindings = path.join(bindingsPath, 'build', 'Release', 'bindings.node');
        if (fs.existsSync(nativeBindings)) {
          console.log('✓ Native bindings found at:', nativeBindings);
        } else {
          console.log('⚠ Native bindings not found, will be handled at runtime');
        }
        
        // 尝试加载模块以检查是否有可用的 native 绑定
        try {
          require('@serialport/bindings-cpp');
          console.log('Native bindings loaded successfully');
        } catch (error) {
          console.log('Native bindings not available, this is expected for cross-platform builds');
          console.log('The application will attempt to load bindings at runtime');
        }
      } else {
        console.log('⚠ @serialport/bindings-cpp module not found');
      }
    }
  }
  
  console.log('Before-build script completed.');
  return true;
};