// main.js - Electron主进程

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const serialManager = require('./serial');

// 禁用Electron安全警告
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 注释掉自动打开开发者工具的代码
  // mainWindow.webContents.openDevTools();

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 300,
              resizable: false,
              minimizable: false,
              maximizable: false,
              parent: mainWindow,
              modal: true,
              webPreferences: {
                preload: path.join(__dirname, 'preload.js')
              }
            });
            aboutWindow.loadFile(path.join(__dirname, 'about.html'));
            aboutWindow.setMenu(null);
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 窗口关闭时断开串口连接
  mainWindow.on('closed', async () => {
    await serialManager.disconnect();
    mainWindow = null;
  });
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow();

  // macOS应用激活时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（Windows/Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 设置IPC通信处理

// 获取可用串口列表
ipcMain.handle('get-ports', async () => {
  try {
    return await serialManager.getPorts();
  } catch (error) {
    console.error('获取串口列表失败:', error);
    throw error;
  }
});

// 连接串口
ipcMain.handle('connect-port', async (event, port, baudRate) => {
  try {
    await serialManager.connect(port, baudRate);
    return { success: true };
  } catch (error) {
    console.error('连接串口失败:', error);
    throw error;
  }
});

// 断开串口连接
ipcMain.handle('disconnect-port', async (event, port) => {
  try {
    if (port) {
      // 断开指定串口
      await serialManager.disconnect(port);
    } else {
      // 断开所有串口（向后兼容）
      await serialManager.disconnectAll();
    }
    return { success: true };
  } catch (error) {
    console.error('断开串口连接失败:', error);
    throw error;
  }
});

// 发送命令
ipcMain.handle('send-command', async (event, commandType, param1, param2, port, deviceId) => {
  try {
    await serialManager.sendCommand(commandType, param1, param2, port, deviceId);
    return { success: true };
  } catch (error) {
    console.error('发送命令失败:', error);
    throw error;
  }
});

// 设置串口事件监听
serialManager.on('data', (data, port) => {
  if (mainWindow) {
    mainWindow.webContents.send('serial-data', data, port);
  }
});

serialManager.on('connected', (port) => {
  if (mainWindow) {
    mainWindow.webContents.send('serial-connected', port);
  }
});

serialManager.on('disconnected', (port) => {
  if (mainWindow) {
    mainWindow.webContents.send('serial-disconnected', port);
  }
});

serialManager.on('error', (message, port) => {
  if (mainWindow) {
    mainWindow.webContents.send('serial-error', message, port);
  }
});