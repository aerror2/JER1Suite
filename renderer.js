// renderer.js - 前端界面交互逻辑

// 从preload.js中获取API
const { getPorts, connectPort, disconnectPort, sendCommand, onSerialData, onSerialConnected, onSerialDisconnected, onSerialError, COMMANDS, formatCommand } = window.api;


// 应用状态
const appState = {
  connected: false,
  motorA: 150,
  motorB: 150,
  autoScroll: true,
  autoConnecting: false,
  autoConnectTimer: null,
  autoConnectInterval: null,
  newPorts: [],
  connectedPorts: [],
  lastPwmSendTime: 0,
  throttleTimer: null,
  lastModifiedMotor: null // 记录最后修改的电机
};

// DOM元素
const elements = {
  // 连接面板
  portSelect: document.getElementById('portSelect'),
  baudRateSelect: document.getElementById('baudRateSelect'),
  refreshPortsBtn: document.getElementById('refreshPortsBtn'),
  connectBtn: document.getElementById('connectBtn'),
  autoConnectBtn: document.getElementById('autoConnectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  connectionStatusDetail: document.getElementById('connectionStatusDetail'),
  connectedDevices: document.getElementById('connectedDevices'),
  
  // 电机控制
  motorASlider: document.getElementById('motorASlider'),
  motorBSlider: document.getElementById('motorBSlider'),
  motorAValue: document.getElementById('motorAValue'),
  motorBValue: document.getElementById('motorBValue'),
  motorButtons: document.querySelectorAll('.motor-btn'),
  startMotorBtn: document.getElementById('startMotorBtn'),
  startRebootBtn: document.getElementById('startRebootBtn'),
  
  // 参数配置
  applyButtons: document.querySelectorAll('.apply-btn'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  queryParamButtons: document.querySelectorAll('.query-param-btn'),
  deviceIdSelect: document.getElementById('deviceIdSelect'),
  setDeviceIdBtn: document.getElementById('setDeviceIdBtn'),
  
  // 日志面板
  logContainer: document.getElementById('logContainer'),
  clearLogBtn: document.getElementById('clearLogBtn'),
  autoScrollCheck: document.getElementById('autoScrollCheck')
};

// 初始化应用
async function initApp() {
  console.log('应用初始化开始...');
  
  // DOM元素已在全局定义
  console.log('DOM元素已获取');
  
  // 加载串口列表
  await refreshPorts();
  console.log('串口列表已刷新');
  
  // 设置事件监听
  setupEventListeners();
  console.log('事件监听已设置');
  
  // 设置串口通信事件监听
  setupSerialListeners();
  //console.log('串口通信事件监听已设置');
  
  // 添加欢迎日志
  console.log('准备添加欢迎日志...');
  addLogEntry('应用已启动', 'info');
  
  // 初始化连接状态
  updateConnectionState(false);
  updateConnectedDevicesUI();
  console.log('应用初始化完成');
}

// 刷新串口列表
async function refreshPorts() {
  try {
    // 清空当前列表
    elements.portSelect.innerHTML = '<option value="">-- 请选择串口 --</option>';
    
    // 获取可用串口
    const ports = await getPorts();
    
    // 保存当前可用串口列表，用于自动连接功能
    const currentPorts = ports.map(port => port.path);
    
    // 检测新增的串口
    if (appState.autoConnecting) {
      const connectedPaths = appState.connectedPorts.map(port => port.path);
      appState.newPorts = currentPorts.filter(path => !connectedPaths.includes(path));
      
      if (appState.newPorts.length > 0) {
        addLogEntry(`检测到 ${appState.newPorts.length} 个新串口设备`, 'info');
        // 自动连接新串口
        for (const portPath of appState.newPorts) {
          autoConnectPort(portPath);
        }
      }
    }
    
    // 添加到下拉列表
    ports.forEach(port => {
      const option = document.createElement('option');
      option.value = port.path;
      option.textContent = `${port.path} - ${port.manufacturer || '未知设备'}`;
      elements.portSelect.appendChild(option);
      
      // 如果已连接，禁用该选项
      if (appState.connectedPorts.some(p => p.path === port.path)) {
        option.disabled = true;
      }
    });
    
    if (ports.length === 0) {
      addLogEntry('未检测到可用串口', 'info');
    } else {
      addLogEntry(`检测到 ${ports.length} 个可用串口`, 'info');
    }
  } catch (error) {
    addLogEntry(`获取串口列表失败: ${error.message}`, 'error');
  }
}


// 自动连接串口
async function autoConnectPort(portPath) {
  const baudRate = 9600;
  
  try {
    addLogEntry(`正在自动连接串口 ${portPath}，波特率 ${baudRate}...`, 'info');
    await connectPort(portPath, baudRate);
    
    // 添加到已连接设备列表
    const portInfo = {
      path: portPath,
      baudRate: baudRate,
      connected: true
    };
    appState.connectedPorts.push(portInfo);
    
    // 更新UI状态
    updateConnectionState(true);
    updateConnectedDevicesUI();
    
    // 开始发送CMD_HOST_CONNECT命令
    startSendingConnectCommand(portPath);
    
    return true;
  } catch (error) {
    addLogEntry(`自动连接失败: ${error.message}`, 'error');
    return false;
  }
}

// 开始发送CMD_HOST_CONNECT命令
function startSendingConnectCommand(portPath) {
  // 创建一个计时器，每100毫秒发送一次CMD_HOST_CONNECT命令，发送10次后停止
  let count = 0;
  const maxCount = 20; // 只发送20次
  
  // 获取设备ID
  const deviceIdSelect = document.getElementById('deviceIdForSend');
  const deviceId = parseInt(deviceIdSelect.value, 10);
  
  const timer = setInterval(async () => {
    try {
      // 使用选择的设备ID发送连接命令
      await sendCommand(COMMANDS.CMD_HOST_CONNECT, 1, 2, portPath, 0);
      count++;
      
      // 记录发送进度
      if (count === 1 || count === maxCount) {
        addLogEntry(`已向 ${portPath} 发送 ${count} 个连接命令`, 'info');
      }
      
      // 发送指定次数后停止
      if (count >= maxCount) {
        clearInterval(timer);
        addLogEntry(`完成向 ${portPath} 发送 ${maxCount} 个连接命令`, 'info');
      }
    } catch (error) {
      clearInterval(timer);
      addLogEntry(`发送连接命令失败: ${error.message}`, 'error');
    }
  }, 100);
}

// 开始自动连接模式
function startAutoConnect() {
  if (appState.autoConnecting) {
    addLogEntry('自动连接模式已经启动', 'info');
    return;
  }
  
  // 断开所有已连接的端口
  disconnectAll();
  
  appState.autoConnecting = true;
  elements.autoConnectBtn.textContent = '停止自动连接';
  elements.autoConnectBtn.classList.add('active');
  
  addLogEntry('已启动自动连接模式，将自动连接新检测到的串口设备', 'info');
  
  // 立即刷新一次串口列表
  refreshPorts();
  
  // 设置定时刷新串口列表
  appState.autoConnectInterval = setInterval(() => {
    refreshPorts();
  }, 1000); // 每秒刷新一次
}

// 停止自动连接模式
function stopAutoConnect() {
  if (!appState.autoConnecting) {
    return;
  }
  
  appState.autoConnecting = false;
  elements.autoConnectBtn.textContent = '自动连接';
  elements.autoConnectBtn.classList.remove('active');
  
  // 清除定时器
  if (appState.autoConnectInterval) {
    clearInterval(appState.autoConnectInterval);
    appState.autoConnectInterval = null;
  }
  
  addLogEntry('已停止自动连接模式', 'info');
}

// 连接串口
async function connect() {
  const portPath = elements.portSelect.value;
  const baudRate = 9600;
  
  if (!portPath) {
    addLogEntry('请选择串口', 'error');
    return;
  }
  
  // 检查是否已经连接
  if (appState.connectedPorts.some(port => port.path === portPath)) {
    addLogEntry(`串口 ${portPath} 已经连接`, 'info');
    return;
  }
  
  try {
    addLogEntry(`正在连接串口 ${portPath}，波特率 ${baudRate}...`, 'info');
    await connectPort(portPath, baudRate);
    
    // 添加到已连接设备列表
    const portInfo = {
      path: portPath,
      baudRate: baudRate,
      connected: true
    };
    appState.connectedPorts.push(portInfo);
    
    // 更新UI状态
    updateConnectionState(true);
    updateConnectedDevicesUI();
    
    // 获取设备版本信息，使用startSendingConnectCommand函数发送多次连接命令
    setTimeout(() => {
      startSendingConnectCommand(portPath);
    }, 500);
  } catch (error) {
    addLogEntry(`连接失败: ${error.message}`, 'error');
  }
}

// 断开指定串口连接
async function disconnectSerialPort(portPath) {
  try {
    await disconnectPort(portPath);
    
    // 从已连接设备列表中移除
    const index = appState.connectedPorts.findIndex(port => port.path === portPath);
    if (index !== -1) {
      appState.connectedPorts.splice(index, 1);
    }
    
    updateConnectedDevicesUI();
    
    // 如果没有连接的设备，更新UI状态
    if (appState.connectedPorts.length === 0) {
      updateConnectionState(false);
    }
    
    addLogEntry(`串口 ${portPath} 已断开连接`, 'info');
  } catch (error) {
    addLogEntry(`断开连接失败: ${error.message}`, 'error');
  }
}

// 断开所有串口连接
async function disconnectAll() {
  try {
    // 断开所有连接
    for (const port of [...appState.connectedPorts]) {
      await disconnectSerialPort(port.path);
    }
    
    // 清空已连接设备列表
    appState.connectedPorts = [];
    
    // 更新UI状态
    updateConnectionState(false);
    updateConnectedDevicesUI();
    
    addLogEntry('所有串口已断开连接', 'info');
  } catch (error) {
    addLogEntry(`断开所有连接失败: ${error.message}`, 'error');
  }
}

// 更新已连接设备UI
function updateConnectedDevicesUI() {
  // 清空当前列表
  elements.connectedDevices.innerHTML = '';
  
  // 如果没有连接的设备，显示提示
  if (appState.connectedPorts.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = '无已连接设备';
    emptyMsg.className = 'empty-message';
    elements.connectedDevices.appendChild(emptyMsg);
    return;
  }
  
  // 添加已连接设备
  for (const port of appState.connectedPorts) {
    const deviceEl = document.createElement('div');
    deviceEl.className = 'connected-device';
    
    const nameEl = document.createElement('span');
    nameEl.textContent = port.path;
    
    const disconnectBtn = document.createElement('button');
    disconnectBtn.textContent = '断开';
    disconnectBtn.className = 'small-btn danger-btn';
    disconnectBtn.onclick = () => disconnectSerialPort(port.path);
    
    deviceEl.appendChild(nameEl);
    deviceEl.appendChild(disconnectBtn);
    
    elements.connectedDevices.appendChild(deviceEl);
  }
}

// 更新连接状态UI
function updateConnectionState(connected) {
  appState.connected = connected || appState.connectedPorts.length > 0;
  
  // 更新按钮状态
  elements.connectBtn.disabled = elements.portSelect.disabled;
  elements.disconnectBtn.disabled = !appState.connected;
  
  // 更新连接状态显示
  const connectedCount = appState.connectedPorts.length;
  const statusText = connectedCount > 0 ? `已连接 (${connectedCount})` : '未连接';
  
  elements.connectionStatus.textContent = statusText;
  elements.connectionStatus.className = appState.connected ? 'connection-status connected' : 'connection-status disconnected';
  elements.connectionStatusDetail.textContent = statusText;
  

}

// 节流函数 - 限制命令发送频率为最多100Hz (每10ms发送一次)
function throttlePwmCommand(motor, value) {
  // 更新应用状态
  if (motor === 'A') {
    appState.motorA = value;
  } else {
    appState.motorB = value;
  }
  
  // 记录当前被修改的电机
  appState.lastModifiedMotor = motor;
  
  // 如果已经有一个定时器在等待，不需要再设置
  if (appState.throttleTimer) {
    return;
  }
  
  const now = Date.now();
  const timeSinceLastSend = now - appState.lastPwmSendTime;
  
  // 如果距离上次发送时间不足33ms，设置一个定时器在剩余时间后发送
  if (timeSinceLastSend < 100) {
    const timeToWait = 100 - timeSinceLastSend;
    appState.throttleTimer = setTimeout(() => {
      appState.throttleTimer = null;
      sendPwmCommand();
    }, timeToWait);
  } else {
    // 否则立即发送
    sendPwmCommand();
  }
  
  // 发送当前状态的PWM命令，同时发送两个电机的PWM值
  function sendPwmCommand() {
    appState.lastPwmSendTime = Date.now();
    // 发送命令，同时传递两个电机的值
    // 使用lastModifiedMotor来确定哪个电机被修改了，用于日志记录
    // 实际上setMotorPWM会同时发送两个电机的值
    setMotorPWM(appState.lastModifiedMotor || 'A', appState.lastModifiedMotor === 'A' ? appState.motorA : appState.motorB);
  }
}

// 设置电机PWM值
async function setMotorPWM(motor, value) {
  if (appState.connectedPorts.length === 0) {
    addLogEntry('没有已连接的设备，无法控制电机', 'error');
    return;
  }
  
  // 确保值在100-200范围内
  const pwmValue = Math.max(100, Math.min(200, Math.floor(value)));
  
  try {
    // 更新应用状态
    if (motor === 'A') {
      appState.motorA = pwmValue;
      addLogEntry(`设置电机A PWM: ${pwmValue}`, 'sent');
    } else {
      appState.motorB = pwmValue;
      addLogEntry(`设置电机B PWM: ${pwmValue}`, 'sent');
    }

    // 获取设备ID
    const deviceIdSelect = document.getElementById('deviceIdForSend');
    const deviceId = parseInt(deviceIdSelect.value, 10);
    
    // 向所有已连接的设备发送命令，同时发送两个电机的PWM值
    for (const port of appState.connectedPorts) {
      // 发送命令：CMD_HOST_SET_PWM + 电机A的PWM值 + 电机B的PWM值 + 设备ID
      await sendCommand(COMMANDS.CMD_HOST_SET_PWM, appState.motorA, appState.motorB, port.path, deviceId);
    }
  } catch (error) {
    addLogEntry(`设置电机PWM失败: ${error.message}`, 'error');
  }
}

// 应用参数设置
async function applyParameter(paramType) {
  if (appState.connectedPorts.length === 0) {
    addLogEntry('没有已连接的设备，无法设置参数', 'error');
    return;
  }
  
  let commandType, paramValue;
  
  switch (paramType) {
    case 'freq':
      commandType = COMMANDS.CMD_HOST_WRITE;
      const funcFreq = COMMANDS.FUNC_FREQ;
      paramValue = parseInt(document.querySelector('select[name="freq"]').value, 10);
      let freqText = '';
      switch(paramValue) {
        case 1: freqText = '低频 (约75Hz)'; break;
        case 2: freqText = '正常 (约150Hz)'; break;
        case 3: freqText = '中频 (约500Hz)'; break;
        case 4: freqText = '高频 (约1000Hz)'; break;
        default: freqText = '未知';
      }
      addLogEntry(`设置PWM频率: ${freqText}`, 'sent');
      
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送参数设置命令
        for (const port of appState.connectedPorts) {
          // 使用功能类型作为param1，参数值作为param2，并传递设备ID
          await sendCommand(commandType, funcFreq, paramValue, port.path, deviceId);
        }
      } catch (error) {
        addLogEntry(`设置参数失败: ${error.message}`, 'error');
      }
      return;
      
    case 'rotation':
      commandType = COMMANDS.CMD_HOST_WRITE;
      const funcDirection = COMMANDS.FUNC_DIRECTION;
      paramValue = parseInt(document.querySelector('select[name="rotation"]').value, 10);
      let rotationText = '';
      switch(paramValue) {
        case 1: rotationText = '双向'; break;
        case 2: rotationText = '单向'; break;
        case 3: rotationText = '舵机模式'; break;
        default: rotationText = '未知';
      }
      addLogEntry(`设置旋转方向: ${rotationText}`, 'sent');
      
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送参数设置命令
        for (const port of appState.connectedPorts) {
          // 使用功能类型作为param1，参数值作为param2，并传递设备ID
          await sendCommand(commandType, funcDirection, paramValue, port.path, deviceId);
        }
      } catch (error) {
        addLogEntry(`设置参数失败: ${error.message}`, 'error');
      }
      return;
      
    case 'decay':
      commandType = COMMANDS.CMD_HOST_WRITE;
      const funcDecay = COMMANDS.FUNC_DECAY;
      paramValue = parseInt(document.querySelector('select[name="decay"]').value, 10);
      let decayText = paramValue === 1 ? '快速' : '慢速';
      addLogEntry(`设置衰减模式: ${decayText}`, 'sent');
      
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送参数设置命令
        for (const port of appState.connectedPorts) {
          // 使用功能类型作为param1，参数值作为param2，并传递设备ID
          await sendCommand(commandType, funcDecay, paramValue, port.path, deviceId);
        }
      } catch (error) {
        addLogEntry(`设置参数失败: ${error.message}`, 'error');
      }
      return;
      
    case 'mix':
      commandType = COMMANDS.CMD_HOST_WRITE;
      const funcMixControl = COMMANDS.FUNC_MIX_CONTROL;
      paramValue = parseInt(document.querySelector('select[name="mix"]').value, 10);
      let mixText = '';
      switch(paramValue) {
        case 1: mixText = '禁用混控'; break;
        case 2: mixText = '启用混控'; break;
        case 3: mixText = '步进电机模式'; break;
        default: mixText = '未知';
      }
      addLogEntry(`设置混控模式: ${mixText}`, 'sent');
      
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送参数设置命令
        for (const port of appState.connectedPorts) {
          // 使用功能类型作为param1，参数值作为param2，并传递设备ID
          await sendCommand(commandType, funcMixControl, paramValue, port.path, deviceId);
        }
      } catch (error) {
        addLogEntry(`设置参数失败: ${error.message}`, 'error');
      }
      return;
      
    case 'deviceId':
      commandType = COMMANDS.CMD_HOST_SET_DEVICE_ID;
      paramValue = parseInt(document.getElementById('deviceIdSelect').value, 10);
      addLogEntry(`设置设备ID: ${paramValue}`, 'sent');
      
      try {
        // 获取当前设备ID
        const currentDeviceIdSelect = document.getElementById('deviceIdForSend');
        const currentDeviceId = parseInt(currentDeviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送设备ID设置命令
        for (const port of appState.connectedPorts) {
          // 设备ID命令格式：CMD_HOST_SET_DEVICE_ID, 新设备ID, 0, 端口, 当前设备ID
          await sendCommand(commandType, paramValue, 0, port.path, currentDeviceId);
        }
      } catch (error) {
        addLogEntry(`设置设备ID失败: ${error.message}`, 'error');
      }
      return;
      
    case 'inputSignal':
      const inputSignalSelect = document.querySelector('select[name="inputSignal"]');
      const inputSignalValue = inputSignalSelect.value;
      const funcInputSignal = COMMANDS.FUNC_INPUT_SIGNAL;
      let inputSignalParam;
      
      switch(inputSignalValue) {
        case '1':
          inputSignalParam = COMMANDS.PARAM_INPUT_SIGNAL_USART_OR_PWM;
          break;
        case '2':
          inputSignalParam = COMMANDS.PARAM_INPUT_SIGNAL_USART_ONLY;
          break;
        case '3':
          inputSignalParam = COMMANDS.PARAM_INPUT_SIGNAL_USART_OR_ADC;
          break;
        default:
          addLogEntry('无效的输入信号选项', 'error');
          return;
      }
      commandType = COMMANDS.CMD_HOST_WRITE;

      addLogEntry(`设置输入信号: ${inputSignalValue}`);
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        for (const port of appState.connectedPorts) {
          await sendCommand(commandType, funcInputSignal, inputSignalParam, port.path, deviceId);
        }
      } catch (error) {
        addLogEntry(`设置输入信号失败: ${error.message}`, 'error');
      }

      break;
      
   
    default:
      addLogEntry(`未知参数类型: ${paramType}`, 'error');
      return;
  }
}



// 添加日志条目
function addLogEntry(message, type = 'info') {

   console.log('Message:', type, message);

}

// 清除日志
function clearLog() {

}

// 设置事件监听
function setupEventListeners() {
  // 连接面板
  elements.refreshPortsBtn.addEventListener('click', refreshPorts);
  elements.connectBtn.addEventListener('click', connect);
  elements.disconnectBtn.addEventListener('click', disconnectAll);
  
  // 自动连接按钮
  elements.autoConnectBtn.addEventListener('click', () => {
    if (appState.autoConnecting) {
      stopAutoConnect();
    } else {
      startAutoConnect();
    }
  });
  
  // 电机控制
  elements.motorASlider.addEventListener('input', () => {
    const value = parseInt(elements.motorASlider.value, 10);
    elements.motorAValue.textContent = value;
    // 使用节流函数发送PWM命令，限制频率为最多100Hz
    throttlePwmCommand('A', value);
  });
  
  elements.motorBSlider.addEventListener('input', () => {
    const value = parseInt(elements.motorBSlider.value, 10);
    elements.motorBValue.textContent = value;
    // 使用节流函数发送PWM命令，限制频率为最多100Hz
    throttlePwmCommand('B', value);
  });
  
  // 保留change事件监听器作为备份，确保在拖动结束时发送最终值
  elements.motorASlider.addEventListener('change', () => {
    const value = parseInt(elements.motorASlider.value, 10);
    setMotorPWM('A', value);
  });
  
  elements.motorBSlider.addEventListener('change', () => {
    const value = parseInt(elements.motorBSlider.value, 10);
    setMotorPWM('B', value);
  });
  
  // 电机按钮
  elements.motorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const motor = button.dataset.motor;
      const value = parseInt(button.dataset.value, 10);
      
      // 更新滑块
      if (motor === 'A') {
        elements.motorASlider.value = value;
        elements.motorAValue.textContent = value;
      } else {
        elements.motorBSlider.value = value;
        elements.motorBValue.textContent = value;
      }
      
      // 设置电机
      setMotorPWM(motor, value);
    });
  });
  
  elements.startMotorBtn.addEventListener('click', async () => {
    if (appState.connectedPorts.length === 0) {
      addLogEntry('没有已连接的设备，无法启动电机', 'error');
      return;
    }
    
    addLogEntry('正在发送启动电机命令...', 'sent');
    
    try {
      // 获取设备ID
      const deviceIdSelect = document.getElementById('deviceIdForSend');
      const deviceId = parseInt(deviceIdSelect.value, 10);
      
      // 向所有已连接的设备发送启动电机命令
      for (const port of appState.connectedPorts) {
        await sendCommand(COMMANDS.CMD_HOST_START, appState.motorA, appState.motorB, port.path, deviceId);
      }
      addLogEntry('启动电机命令已发送', 'info');
    } catch (error) {
      addLogEntry(`启动电机失败: ${error.message}`, 'error');
    }
  });
  
  // 参数配置
  elements.applyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const paramType = button.dataset.param;
      applyParameter(paramType);
    });
  });
  
  // 保存设置按钮
  elements.saveConfigBtn.addEventListener('click', async () => {
    if (appState.connectedPorts.length === 0) {
      addLogEntry('没有已连接的设备，无法保存设置', 'error');
      return;
    }
    
    addLogEntry('正在保存设置到设备...', 'sent');
    
    try {
      // 获取设备ID
      const deviceIdSelect = document.getElementById('deviceIdForSend');
      const deviceId = parseInt(deviceIdSelect.value, 10);
      
      // 向所有已连接的设备发送保存设置命令
      for (const port of appState.connectedPorts) {
        await sendCommand(COMMANDS.CMD_HOST_SAVE, 0, 0, port.path, deviceId);
      }
      addLogEntry('设置已成功保存到设备', 'info');
    } catch (error) {
      addLogEntry(`保存设置失败: ${error.message}`, 'error');
    }
  });
  
  // 查询参数按钮
  elements.queryParamButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (appState.connectedPorts.length === 0) {
        addLogEntry('没有已连接的设备，无法查询参数', 'error');
        return;
      }
      
      const paramType = button.getAttribute('data-param');
      let funcParam;
      
      // 根据data-param属性设置对应的功能参数
      switch(paramType) {
        case 'freq':
          funcParam = COMMANDS.FUNC_FREQ;
          break;
        case 'decay':
          funcParam = COMMANDS.FUNC_DECAY;
          break;
        case 'mix':
          funcParam = COMMANDS.FUNC_MIX_CONTROL;
          break;
        case 'rotation':
          funcParam = COMMANDS.FUNC_DIRECTION;
          break;
        case 'deviceId':
          funcParam = COMMANDS.FUNC_DIRECTION; // 设备ID使用方向功能
          break;
        case 'inputSignal':
          funcParam = COMMANDS.FUNC_INPUT_SIGNAL;
          break;
        default:
          addLogEntry(`未知参数类型: ${paramType}`, 'error');
          return;
      }
      
      addLogEntry(`正在查询${paramType}参数...`, 'sent');
      
      try {
        // 获取设备ID
        const deviceIdSelect = document.getElementById('deviceIdForSend');
        const deviceId = parseInt(deviceIdSelect.value, 10);
        
        // 向所有已连接的设备发送查询参数命令
        for (const port of appState.connectedPorts) {
          await sendCommand(COMMANDS.CMD_HOST_QUERY_PARAM, funcParam, 0, port.path, deviceId);
        }
        addLogEntry(`${paramType}参数查询命令已发送`, 'info');
      } catch (error) {
        addLogEntry(`查询${paramType}参数失败: ${error.message}`, 'error');
      }
    });
  });
  
  // 重启设备按钮
  elements.startRebootBtn.addEventListener('click', async () => {
    if (appState.connectedPorts.length === 0) {
      addLogEntry('没有已连接的设备，无法重启设备', 'error');
      return;
    }
    
    addLogEntry('正在发送重启设备命令...', 'sent');
    
    try {
      // 保存当前连接的端口列表，因为重启后可能会断开连接
      const connectedPortPaths = appState.connectedPorts.map(port => port.path);
      
      // 获取设备ID
      const deviceIdSelect = document.getElementById('deviceIdForSend');
      const deviceId = parseInt(deviceIdSelect.value, 10);
      
      // 向所有已连接的设备发送重启命令
      for (const port of appState.connectedPorts) {
        await sendCommand(COMMANDS.CMD_HOST_REBOOT, 0, 0, port.path, deviceId);
      }
      addLogEntry('重启设备命令已发送', 'info');
      
      // 等待2秒后重新连接设备
      addLogEntry('等待2秒后将尝试重新连接设备...', 'info');
      setTimeout(() => {
        // 对每个之前连接的端口调用startSendingConnectCommand
        for (const portPath of connectedPortPaths) {
          addLogEntry(`尝试重新连接设备: ${portPath}`, 'info');
          startSendingConnectCommand(portPath);
        }
      }, 2000);
    } catch (error) {
      addLogEntry(`重启设备失败: ${error.message}`, 'error');
    }
  });

  // 设备ID设置按钮
  elements.setDeviceIdBtn.addEventListener('click', async () => {
    if (appState.connectedPorts.length === 0) {
      addLogEntry('没有已连接的设备，无法设置设备ID', 'error');
      return;
    }

    const deviceId = parseInt(elements.deviceIdSelect.value, 10);
    addLogEntry(`正在设置设备ID为: ${deviceId}`, 'sent');

    try {
      // 获取当前设备ID
      const currentDeviceIdSelect = document.getElementById('deviceIdForSend');
      const currentDeviceId = parseInt(currentDeviceIdSelect.value, 10);
      
      // 向所有已连接的设备发送设置设备ID命令
      for (const port of appState.connectedPorts) {
        await sendCommand(COMMANDS.CMD_HOST_SET_DEVICE_ID, deviceId, 0, port.path, currentDeviceId);
      }
      addLogEntry(`设备ID已设置为: ${deviceId}`, 'info');
    } catch (error) {
      addLogEntry(`设置设备ID失败: ${error.message}`, 'error');
    }
  });
}

// 设置串口通信事件监听
function  setupSerialListeners() {
  // 接收数据
  onSerialData((data, port) => {
    // 如果是字符串，直接显示
    if (typeof data === 'string') {
      addLogEntry(`接收(${port}): ${data}`, 'received');
      return;
    }
    
    // 如果是解析后的对象
    if (data && typeof data === 'object') {
     
    }
  });
  
  // 连接成功
  onSerialConnected((port) => {
    addLogEntry(`串口 ${port} 连接成功`, 'info');
    // 注意：连接状态现在由 connect 或 autoConnectPort 函数更新
  });
  
  // 断开连接
  onSerialDisconnected((port) => {
    addLogEntry(`串口 ${port} 连接已断开`, 'info');
    
    // 从已连接设备列表中移除
    const index = appState.connectedPorts.findIndex(p => p.path === port);
    if (index !== -1) {
      appState.connectedPorts.splice(index, 1);
      updateConnectedDevicesUI();
      updateConnectionState(appState.connectedPorts.length > 0);
    }
  });
  
  // 错误处理
  onSerialError((message, port) => {
    addLogEntry(`串口错误(${port || '未知'}): ${message}`, 'error');
  });
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);