const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class NativeModuleHandler {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.appPath = app.getAppPath();
    this.nodeModulesPath = path.join(this.appPath, 'node_modules');
  }

  async ensureSerialPortBindings() {
    if (!this.isWindows) {
      return true; // Only handle Windows for now
    }

    const bindingsPath = path.join(this.nodeModulesPath, '@serialport', 'bindings-cpp');
    
    if (!fs.existsSync(bindingsPath)) {
      console.error('SerialPort bindings module not found');
      return false;
    }

    // Check if native bindings exist
    const possibleBindingPaths = [
      path.join(bindingsPath, 'build', 'Release', 'bindings.node'),
      path.join(bindingsPath, 'prebuilds', `win32-x64`, 'node.abi116.node'),
      path.join(bindingsPath, 'prebuilds', `win32-x64`, 'electron.abi116.node')
    ];

    for (const bindingPath of possibleBindingPaths) {
      if (fs.existsSync(bindingPath)) {
        console.log('Found native bindings at:', bindingPath);
        return true;
      }
    }

    console.log('Native bindings not found, attempting to install prebuilt binaries...');
    
    try {
      // Try to install prebuilt binaries
      await this.installPrebuiltBindings();
      return true;
    } catch (error) {
      console.error('Failed to install prebuilt binaries:', error.message);
      return false;
    }
  }

  async installPrebuiltBindings() {
    const bindingsPath = path.join(this.nodeModulesPath, '@serialport', 'bindings-cpp');
    
    try {
      // Use prebuild-install to download prebuilt binaries
      const prebuildInstallPath = path.join(this.nodeModulesPath, '.bin', 'prebuild-install.cmd');
      
      if (fs.existsSync(prebuildInstallPath)) {
        console.log('Running prebuild-install...');
        execSync(`"${prebuildInstallPath}" --runtime=electron --target=25.9.8 --arch=x64`, {
          cwd: bindingsPath,
          stdio: 'inherit'
        });
      } else {
        // Fallback: try to use npm to rebuild
        console.log('Attempting npm rebuild...');
        execSync('npm rebuild @serialport/bindings-cpp --runtime=electron --target=25.9.8 --arch=x64', {
          cwd: this.appPath,
          stdio: 'inherit'
        });
      }
    } catch (error) {
      throw new Error(`Failed to install prebuilt bindings: ${error.message}`);
    }
  }

  async initializeSerialPort() {
    try {
      await this.ensureSerialPortBindings();
      
      // Try to load SerialPort
      const { SerialPort } = require('serialport');
      console.log('SerialPort loaded successfully');
      return SerialPort;
    } catch (error) {
      console.error('Failed to initialize SerialPort:', error.message);
      
      // Return a mock SerialPort for graceful degradation
      return this.createMockSerialPort();
    }
  }

  createMockSerialPort() {
    console.warn('Using mock SerialPort - serial communication will not work');
    
    return {
      list: async () => {
        console.warn('Mock SerialPort.list() called');
        return [];
      },
      // Add other mock methods as needed
    };
  }
}

module.exports = NativeModuleHandler;