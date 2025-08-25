

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class SerialConnection {
  constructor(portPath, baudRate = 9600) {
    this.portPath = portPath;
    this.baudRate = baudRate;
    this.port = null;
    this.parser = null;
    this.isConnected = false;
  }

  // 连接串口
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.port = new SerialPort({
          path: this.portPath,
          baudRate: this.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false
        });

        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        // 打开串口
        this.port.open((err) => {
          if (err) {
            console.error(`串口 ${this.portPath} 连接失败:`, err);
            reject(err);
            return;
          }
          
          this.isConnected = true;
          console.log(`串口 ${this.portPath} 已连接，波特率: ${this.baudRate}`);
          resolve();
        });

        return this;
      } catch (error) {
        console.error(`串口 ${this.portPath} 连接失败:`, error);
        reject(error);
      }
    });
  }

  // 断开串口连接
  disconnect() {
    return new Promise((resolve) => {
      if (!this.isConnected || !this.port) {
        resolve();
        return;
      }

      this.port.close((err) => {
        if (err) {
          console.error(`断开串口 ${this.portPath} 连接时出错:`, err);
        }
        this.isConnected = false;
        this.port = null;
        this.parser = null;
        resolve();
      });
    });
  }


  // 发送命令
  sendCommand(commandType, param1 = 0, param2 = 0, deviceId = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.port) {
        reject(new Error(`串口 ${this.portPath} 未连接`));
        return;
      }

      // 获取设备ID，如果没有提供则使用0（无ID）
      var xcmd = deviceId*16+commandType;
      // 构建命令，加入设备ID作为第二个字节
      const command = Buffer.from([0x55,xcmd , param1, param2, xcmd+param1+param2]);
      console.log(`发送命令到 ${this.portPath} (设备ID: ${deviceId}):`, command);

      this.port.write(command, (err) => {
        if (err) {
          console.error(`发送命令到 ${this.portPath} 失败:`, err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

class MultiSerialManager {
  constructor() {
    this.connections = {}; // 存储所有串口连接，键为串口路径
    this.listeners = {
      data: [],
      connected: [],
      disconnected: [],
      error: []
    };
  }

  // 获取可用串口列表
  async getPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || '未知',
        serialNumber: port.serialNumber || '未知',
        pnpId: port.pnpId || '未知'
      }));
    } catch (error) {
      console.error('获取串口列表失败:', error);
      throw error;
    }
  }

  // 连接串口
  async connect(portPath, baudRate = 9600) {
    // 检查是否已经连接
    if (this.connections[portPath] && this.connections[portPath].isConnected) {
      console.log(`串口 ${portPath} 已经连接`);
      return;
    }

    try {
      // 创建新的串口连接
      const connection = new SerialConnection(portPath, baudRate);
      await connection.connect();
      
      // 设置事件监听
      if (connection.port) {
        connection.port.on('close', () => {
          console.log(`串口 ${portPath} 已断开`);
          if (this.connections[portPath]) {
            this.connections[portPath].isConnected = false;
            delete this.connections[portPath];
          }
          this._notifyListeners('disconnected', portPath);
        });

        connection.port.on('error', (err) => {
          console.error(`串口 ${portPath} 错误:`, err);
          this._notifyListeners('error', err.message, portPath);
        });

        if (connection.parser) {
          connection.parser.on('data', (data) => {
            console.log(`接收数据(${portPath}):`);
          
          });
        }
      }

      // 保存连接
      this.connections[portPath] = connection;
      this._notifyListeners('connected', portPath);
      
      return connection;
    } catch (error) {
      console.error(`连接串口 ${portPath} 失败:`, error);
      this._notifyListeners('error', error.message, portPath);
      throw error;
    }
  }

  // 断开指定串口连接
  async disconnect(portPath) {
    if (!this.connections[portPath]) {
      console.log(`串口 ${portPath} 未连接`);
      return;
    }

    try {
      await this.connections[portPath].disconnect();
      delete this.connections[portPath];
      console.log(`串口 ${portPath} 已断开连接`);
    } catch (error) {
      console.error(`断开串口 ${portPath} 连接失败:`, error);
      throw error;
    }
  }

  // 断开所有串口连接
  async disconnectAll() {
    const portPaths = Object.keys(this.connections);
    
    if (portPaths.length === 0) {
      return;
    }
    
    for (const portPath of portPaths) {
      await this.disconnect(portPath);
    }
  }
  


  // 发送命令到指定串口
  async sendCommand(commandType, param1 = 0, param2 = 0, portPath, deviceId = 0) {
    // 如果指定了端口，只发送到该端口
    if (portPath) {
      if (!this.connections[portPath] || !this.connections[portPath].isConnected) {
        throw new Error(`串口 ${portPath} 未连接`);
      }
      
      return await this.connections[portPath].sendCommand(commandType, param1, param2, deviceId);
    }
    
    // 如果没有指定端口，发送到第一个连接的端口（向后兼容）
    const firstPort = Object.keys(this.connections)[0];
    if (!firstPort) {
      throw new Error('没有已连接的串口');
    }
    
    return await this.connections[firstPort].sendCommand(commandType, param1, param2, deviceId);
  }

  // 添加事件监听器
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // 移除事件监听器
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // 通知所有监听器
  _notifyListeners(event, data, portPath) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data, portPath));
    }
  }
}

module.exports = new MultiSerialManager();