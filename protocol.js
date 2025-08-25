// protocol.js - 定义与设备通信的协议


// 命令类型定义
const COMMANDS = {
  // 基本命令

 CMD_HOST_CONNECT:    0x7F,// Host 连接指令
 CMD_HOST_SET_PWM:    0x81,  // Host 设置pwm1, pwm2
 CMD_HOST_WRITE:      0x1,  // Host 写入配置
 CMD_HOST_SAVE :      0x2,  // Host 保存设置
 CMD_HOST_START :     0x3,  // Host 启动电机
 CMD_HOST_RESET_DEFAULT: 0x4, // 设置全部回到默认


  // 功能命令
  FUNC_FREQ: 0x01,
  FUNC_DECAY: 0x02,
  FUNC_MIX_CONTROL: 0x03,
  FUNC_DIRECTION: 0x04,
  
  // 频率参数
  PARAM_FREQ_LOW: 0x01,      // 低频 (约75Hz)
  PARAM_FREQ_NORMAL: 0x02,   // 正常 (约150Hz)
  PARAM_FREQ_MEDIUM: 0x03,   // 中频 (约500Hz)
  PARAM_FREQ_HIGH: 0x04,     // 高频 (约1000Hz)
  
  // 旋转方向参数
  PARAM_DIR_BIDIRECT: 0x01,  // 双向
  PARAM_DIR_UNIDIRECT: 0x02, // 单向
  PARAM_DIR_SERVO: 0x03,     // 舵机模式
  
  // 衰减模式参数
  PARAM_DECAY_FAST: 0x01,    // 快速 (步进电机四拍/MOS衰减)
  PARAM_DECAY_SLOW: 0x02,    // 慢速 (步进电机八拍/电机衰减)
  
  // 混控模式参数
  PARAM_MIX_DISABLE: 0x01,   // 禁用混控
  PARAM_MIX_ENABLE: 0x02,    // 启用混控
  PARAM_MIX_STEP_MOTOR: 0x03 // 步进电机模式
};

// 命令格式化函数
function formatCommand(commandType, param1 = 0, param2 = 0) {
  // 命令格式: 0x55 + 命令类型 + 参数1 + 参数2
  
  return Buffer.from([0x55, commandType, param1, param2, 0xaa]);
}

// 导出模块
module.exports = {
  COMMANDS,
  formatCommand
};