
# JER1Suite (English)

This is a cross-platform GUI application based on Electron for controlling JER1 devices. The application provides an intuitive user interface for easy configuration and control of various device parameters and functions.

## Features

- **Serial Communication**: Automatic detection of available serial ports, support for multiple baud rates
- **Motor Control**: Precise control of two motors' PWM values (-100% to +100%)
- **Parameter Configuration**:
  - PWM frequency adjustment (Low/Normal/Medium/High frequency)
  - Rotation direction control (Bidirectional/Unidirectional/Servo mode/Horn mode)
  - Decay mode settings (Fast/Slow)
  - Mix control mode settings (Disable/Enable/Stepper motor mode)
  - Input signal mode (USART or PWM/USART only/USART or ADC)
- **Device Management**: Support for multi-device bus control (up to 15 devices)
- **Real-time Monitoring**: Real-time communication log display for debugging
- **Emergency Stop**: One-click stop for all motor operations

## Installation Guide

### System Requirements

- Windows 7 or higher
- macOS 10.11 or higher
- Linux (Ubuntu 16.04 or higher)

### Building from Source

1. Ensure Node.js is installed (v16 or higher recommended)

2. Clone the repository and install dependencies:

```bash
git clone https://github.com/aerror2/JER1Suite.git
cd JER1Suite
npm install
```

3. Start the application:

```bash
npm start
```

4. Build executable files:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Usage Instructions

### Connecting Device

1. Start the application
2. Select the correct serial port and baud rate in the left panel (default 115200)
3. Click the "Connect" button
4. After successful connection, the status indicator will turn green

### Motor Control

- Use sliders to adjust motor speed and direction
- Use preset buttons to quickly set common speeds
- In emergency situations, click the "Emergency Stop" button to immediately stop all motors

### Parameter Configuration

1. Select the desired parameter settings in the middle panel
2. Click the corresponding "Apply" button to send settings to the device

## Communication Protocol

The application uses the following command format to communicate with devices:

```
Command Format: 0x55 + Command Type + Parameter1 + Parameter2 + Checksum
Command Type: High 4 bits are device ID, low 4 bits are command
Checksum = Command Type + Parameter1 + Parameter2
```

### Main Commands

#### Basic Commands
- `0x0F`: Host connection command
- `0x01`: Host write configuration
- `0x02`: Host save settings
- `0x03`: Host start motor
- `0x04`: Reset all to default
- `0x05`: Reboot device
- `0x06`: Host set PWM1, PWM2
- `0x07`: Set device ID (for bus identification, 1-15 specific devices, 0 for all)
- `0x08`: Query device parameters

#### Function Commands
- `0x01`: Frequency setting
- `0x02`: Decay mode setting
- `0x03`: Mix control mode setting
- `0x04`: Rotation direction setting
- `0x05`: Input signal setting

### Parameter Definitions

#### Working Frequency Setting Parameters
- `0x01`: Low frequency (75Hz/Low current/Siren)
- `0x02`: Normal (150Hz/Normal current/Ambulance)
- `0x03`: Medium frequency (500Hz/Medium current/Fire truck)
- `0x04`: High frequency (1000Hz/High current/Electronic shooting)

*Multi-mode Function Description:*
- **PWM Mode**: Controls PWM frequency
- **Stepper Motor Mode**: Controls current level
- **Horn Mode**: Controls sound effect type

#### Direction Setting Parameters
- `0x01`: Bidirectional mode (allows forward and reverse)
- `0x02`: Unidirectional mode (single direction rotation only)
- `0x03`: Servo mode (bidirectional with boundaries, position control mode)
- `0x04`: Horn mode (S1 car horn/S2 siren sound)

#### Decay Setting Parameters
- `0x01`: Fast decay (4-beat mode/Low frequency horn)
- `0x02`: Slow decay (8-beat mode/High frequency horn)

*Multi-mode Function Description:*
- **Normal Mode**: MOS decay/Motor decay
- **Stepper Motor Mode**: 4-beat/8-beat control
- **Horn Mode**: Low frequency horn/High frequency horn

#### Mix Control Setting Parameters
- `0x01`: Disable mix control (two channels independent, independent control of two channels)
- `0x02`: Enable mix control (differential steering, mixed control for differential steering)
- `0x03`: Stepper motor mode (4 or 5-wire stepper motor, uses stepper motor control logic)

#### Input Signal Setting Parameters
- `0x01`: Auto detect input signal (auto detect PWM/Serial/ADC)
- `0x02`: Serial input only (accept serial commands only)
- `0x03`: Serial or ADC input (serial commands or analog input)

#### Device ID Parameters
- `0x00`: No ID (broadcast mode)
- `0x01-0x0F`: Device ID 1-15 (for bus identification, one USART controls up to 15 devices)

### Command Examples

```javascript
// Set PWM frequency to high frequency
const command = [0x55, 0x01, 0x01, 0x04, 0x06]; // 0x55 + FUNC_FREQ + PARAM_FREQ_HIGH + checksum

// Set motor PWM values
const pwmCommand = [0x55, 0x06, pwm1Value, pwm2Value, checksum];

// Connect device
const connectCommand = [0x55, 0x0F, 0x00, 0x00, 0x0F];
```

## Troubleshooting

### Unable to Connect Device

- Confirm the device is properly connected to the computer
- Verify the correct serial port and baud rate are selected
- Check if device drivers are properly installed
- Try reconnecting the USB connection
- Check if device ID settings are correct

### Motor Not Responding to Commands

- Check if connection status is normal
- Confirm motor power is connected
- Try resetting the device (send reboot command)
- Check communication log for error messages
- Verify command format and checksum are correct

### Multi-device Communication Issues

- Confirm each device has a unique ID setting (1-15)
- Check if bus connections are normal
- Use device ID 0 for broadcast testing
- Test devices individually

## Developer Information

### Project Structure

- `main.js`: Electron main process
- `preload.js`: Preload script, provides secure IPC communication and protocol definitions
- `renderer.js`: Renderer process, handles UI interactions
- `serial.js`: Serial communication management
- `protocol.js`: Communication protocol handling
- `index.html`: Main interface
- `styles.css`: Stylesheet

### Technology Stack

- Electron: Cross-platform desktop application framework
- SerialPort: Node.js serial communication library
- HTML/CSS/JavaScript: Frontend interface

### Protocol Implementation

Protocol-related constants and functions are defined in `preload.js`:
- `COMMANDS`: Contains constant definitions for all commands and parameters
- `formatCommand()`: Command formatting function, automatically calculates checksum

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

# JER1Suite

这是一个基于Electron的跨平台GUI应用程序，用于控制JER1设备。该应用提供了直观的用户界面，可以轻松配置和控制设备的各种参数和功能。

## 功能特点

- **串口通信**：自动检测可用串口，支持多种波特率
- **电机控制**：精确控制两个电机的PWM值（-100%至+100%）
- **参数配置**：
  - PWM频率调节（低频/正常/中频/高频）
  - 旋转方向控制（双向/单向/舵机模式/喇叭模式）
  - 衰减模式设置（快速/慢速）
  - 混控模式设置（禁用/启用/步进电机模式）
  - 输入信号模式（USART或PWM/仅USART/USART或ADC）
- **设备管理**：支持多设备总线控制（最多15个设备）
- **实时监控**：通信日志实时显示，便于调试
- **紧急停止**：一键停止所有电机运行

## 安装指南

### 系统要求

- Windows 7或更高版本
- macOS 10.11或更高版本
- Linux（Ubuntu 16.04或更高版本）

### 从源代码构建

1. 确保已安装Node.js（推荐v16或更高版本）

2. 克隆仓库并安装依赖：

```bash
git clone https://github.com/aerror2/JER1Suite.git
cd  JER1Suite
npm install
```

3. 启动应用：

```bash
npm start
```

4. 构建可执行文件：

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 使用说明

### 连接设备

1. 启动应用程序
2. 在左侧面板中选择正确的串口和波特率（默认115200）
3. 点击"连接"按钮
4. 连接成功后，状态指示器将变为绿色

### 控制电机

- 使用滑块调节电机速度和方向
- 使用预设按钮快速设置常用速度
- 紧急情况下，点击"紧急停止"按钮立即停止所有电机

### 配置参数

1. 在中间面板中选择所需的参数设置
2. 点击对应的"应用"按钮将设置发送到设备

## 通信协议

应用使用以下命令格式与设备通信：

```
命令格式: 0x55 + 命令类型 + 参数1 + 参数2 + 校验和
命令类型: 高4位是设备ID，低4位是命令
校验和 = 命令类型 + 参数1 + 参数2
```

### 主要命令

#### 基本命令
- `0x0F`: Host连接指令
- `0x01`: Host写入配置
- `0x02`: Host保存设置
- `0x03`: Host启动电机
- `0x04`: 设置全部回到默认
- `0x05`: 重启设备
- `0x06`: Host设置PWM1, PWM2
- `0x07`: 设置设备ID（用于总线识别，1-15特定设备，0表示全部）
- `0x08`: 查询设备参数

#### 功能命令
- `0x01`: 频率设置
- `0x02`: 衰减模式设置
- `0x03`: 混控模式设置
- `0x04`: 旋转方向设置
- `0x05`: 输入信号设置

### 参数定义

#### 工作频率设置参数
- `0x01`: 低频（75Hz/电流低/警笛）
- `0x02`: 正常（150Hz/电流正常/救护车）
- `0x03`: 中频（500Hz/电流中/消防车）
- `0x04`: 高频（1000Hz/电流高/电子射击）

*多模式功能说明：*
- **PWM模式**: 控制PWM频率
- **步进电机模式**: 控制电流等级
- **喇叭模式**: 控制音效类型

#### 方向设置参数
- `0x01`: 双向模式（允许正反转）
- `0x02`: 单向模式（仅单向旋转）
- `0x03`: 舵机模式（双向有边界，位置控制模式）
- `0x04`: 喇叭模式（S1汽车鸣笛/S2警笛声）

#### 衰减设置参数
- `0x01`: 快速衰减（4拍模式/低频汽笛）
- `0x02`: 慢速衰减（8拍模式/高频汽笛）

*多模式功能说明：*
- **普通模式**: MOS衰减/电机衰减
- **步进电机模式**: 4拍/8拍控制
- **喇叭模式**: 低频汽笛/高频汽笛

#### 混控设置参数
- `0x01`: 禁用混控（两路独立，两个通道独立控制）
- `0x02`: 启用混控（差速转向，混合控制实现差速转向）
- `0x03`: 步进电机模式（4或5线步进电机，使用步进电机控制逻辑）

#### 输入信号设置参数
- `0x01`: 自动检测输入信号（自动检测PWM/串口/ADC）
- `0x02`: 仅使用串口输入（只接受串口命令）
- `0x03`: 串口或ADC输入（串口命令或模拟量输入）

#### 设备ID参数
- `0x00`: 无ID（广播模式）
- `0x01-0x0F`: 设备ID 1-15（用于总线识别，一个USART控制最多15个设备）

### 命令示例

```javascript
// 设置PWM频率为高频
const command = [0x55, 0x01, 0x01, 0x04, 0x06]; // 0x55 + FUNC_FREQ + PARAM_FREQ_HIGH + 校验和

// 设置电机PWM值
const pwmCommand = [0x55, 0x06, pwm1Value, pwm2Value, checksum];

// 连接设备
const connectCommand = [0x55, 0x0F, 0x00, 0x00, 0x0F];
```

## 故障排除

### 无法连接设备

- 确认设备已正确连接到计算机
- 验证选择了正确的串口和波特率
- 检查设备驱动是否正确安装
- 尝试重新插拔USB连接
- 检查设备ID设置是否正确

### 电机不响应命令

- 检查连接状态是否正常
- 确认电机电源是否接通
- 尝试重置设备（发送重启命令）
- 检查通信日志中是否有错误信息
- 验证命令格式和校验和是否正确

### 多设备通信问题

- 确认每个设备的ID设置唯一（1-15）
- 检查总线连接是否正常
- 使用设备ID 0 进行广播测试
- 逐个设备测试连接

## 开发者信息

### 项目结构

- `main.js`: Electron主进程
- `preload.js`: 预加载脚本，提供安全的IPC通信和协议定义
- `renderer.js`: 渲染进程，处理UI交互
- `serial.js`: 串口通信管理
- `protocol.js`: 通信协议处理
- `index.html`: 主界面
- `styles.css`: 样式表

### 技术栈

- Electron: 跨平台桌面应用框架
- SerialPort: Node.js串口通信库
- HTML/CSS/JavaScript: 前端界面

### 协议实现

协议相关的常量和函数定义在 `preload.js` 中：
- `COMMANDS`: 包含所有命令和参数的常量定义
- `formatCommand()`: 命令格式化函数，自动计算校验和

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。
