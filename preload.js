// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 直接在 preload.js 中定义 COMMANDS 常量和 formatCommand 函数，避免模块加载问题
// 命令类型定义
const COMMANDS = {
  // 基本命令
  CMD_HOST_CONNECT:    0xF,// Host 连接指令
  CMD_HOST_WRITE:      0x1,  // Host 写入配置
  CMD_HOST_SAVE :      0x2,  // Host 保存设置
  CMD_HOST_START :     0x3,  // Host 启动电机
  CMD_HOST_RESET_DEFAULT: 0x4, // 设置全部回到默认
  CMD_HOST_REBOOT:  0x5,  // 重启
  CMD_HOST_SET_PWM:    0x6,  // Host 设置pwm1, pwm2
  CMD_HOST_SET_DEVICE_ID:0x7, //设置设备的ID,用于总线识别，一个usart控制最多15个设备, 1-15特定device， 0表示全部。
  CMD_HOST_QUERY_PARAM: 0x8,  // 查询设备参数


  // 功能命令
  FUNC_FREQ: 0x01,
  FUNC_DECAY: 0x02,
  FUNC_MIX_CONTROL: 0x03,
  FUNC_DIRECTION: 0x04,
  FUNC_INPUT_SIGNAL: 0x05,
  
  // 频率参数
  PARAM_FREQ_LOW: 0x01,      // 低频 (约75Hz)
  PARAM_FREQ_NORMAL: 0x02,   // 正常 (约150Hz)
  PARAM_FREQ_MEDIUM: 0x03,   // 中频 (约500Hz)
  PARAM_FREQ_HIGH: 0x04,     // 高频 (约1000Hz)
  
  // 旋转方向参数
  PARAM_DIR_BIDIRECT: 0x01,  // 双向
  PARAM_DIR_UNIDIRECT: 0x02, // 单向
  PARAM_DIR_SERVO: 0x03,     // 舵机模式
  PARAM_DIR_SPEAKER:     0x04,  // 喇叭， S1 汽车鸣笛，S2 警笛

  // 衰减模式参数
  PARAM_DECAY_FAST: 0x01,    // 快速 (步进电机四拍/MOS衰减)
  PARAM_DECAY_SLOW: 0x02,    // 慢速 (步进电机八拍/电机衰减)
  
  // 混控模式参数
  PARAM_MIX_DISABLE: 0x01,   // 禁用混控
  PARAM_MIX_ENABLE: 0x02,    // 启用混控
  PARAM_MIX_STEP_MOTOR:0x03, // 步进电机模式
  
  // 输入信号参数
  PARAM_INPUT_SIGNAL_USART_OR_PWM: 0x01,  // USART或PWM
  PARAM_INPUT_SIGNAL_USART_ONLY: 0x02,    // 仅USART
  PARAM_INPUT_SIGNAL_USART_OR_ADC: 0x03   // USART或ADC

};

// 命令格式化函数
function formatCommand(commandType, param1 = 0, param2 = 0) {
  // 命令格式: 0x55 + 命令类型 + 参数1 + 参数2
  return Buffer.from([0x55, commandType, param1, param2, commandType+param1+param2]);
}

contextBridge.exposeInMainWorld('api', {
  // 串口操作
  getPorts: () => ipcRenderer.invoke('get-ports'),
  connectPort: (port, baudRate) => ipcRenderer.invoke('connect-port', port, baudRate),
  disconnectPort: (port) => ipcRenderer.invoke('disconnect-port', port),
  
  // 命令操作
  sendCommand: (commandType, param1, param2, port, deviceId = 0) => 
    ipcRenderer.invoke('send-command', commandType, param1, param2, port, deviceId),
    
  // 协议常量
  COMMANDS: COMMANDS,
  formatCommand: formatCommand,
  
  // 事件监听
  onSerialData: (callback) => {
    ipcRenderer.on('serial-data', (event, data, port) => callback(data, port));
  },
  onSerialConnected: (callback) => {
    ipcRenderer.on('serial-connected', (event, port) => callback(port));
  },
  onSerialDisconnected: (callback) => {
    ipcRenderer.on('serial-disconnected', (event, port) => callback(port));
  },
  onSerialError: (callback) => {
    ipcRenderer.on('serial-error', (event, message, port) => callback(message, port));
  }
});