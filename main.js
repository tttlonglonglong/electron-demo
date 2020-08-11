const { app, Menu, ipcMain, dialog } = require('electron')
const isDev = require('electron-is-dev')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const menuTemplate = require('./src/menuTemplate')
const AppWindow = require('./src/AppWindow')
const Store = require('electron-store')
const QiniuManager = require('./src/utils/QiniuManager')
const settingsStore = new Store({ name: 'Settings' })
const fileStore = new Store({ name: 'Files Data' })
let mainWindow, settingsWindow

console.log('启动main.js')
const createManager = () => {
  const accessKey = settingsStore.get('accessKey')
  const secretKey = settingsStore.get('secretKey')
  const bucketName = settingsStore.get('bucketName')
  return new QiniuManager(accessKey, secretKey, bucketName)
}

console.log('autoUpdater', autoUpdater.checkForUpdatesAndNotify)
app.on('ready', () => {
  if (isDev) {
    autoUpdater.updateConfigPath = path.resolve(__dirname, './dev-app-update.yml')
  }
  // 不需要自动下载
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdatesAndNotify()
  // autoUpdater.checkForUpdates()
  // 只有运行了npm run 
  autoUpdater.on("error", (error) => {
    dialog.showErrorBox("Error:", error == null ? "unknow" : (error.status))
  })
  autoUpdater.on("checking-for-update", () => {
    console.log("checking-for-update")
  })
  autoUpdater.on("update-available", () => {
    dialog.showMessageBox({
      type: "info",
      title: "应用有新的版本",
      message: '发现新版本，是否现在更新？',
      buttons: ['是', '否'],
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  autoUpdater.on("update-not-available", () => {
    console.log('update-not-available')

  })
  autoUpdater.on("download-progress", (processObj) => {
    let log_message = "Download speed: " + processObj.bytesPerSecond
    log_message = log_message + " - Downloaded " + processObj.percent + '%'
    log_message = log_message + " (" + processObj.transferred + ") " + processObj
    console.log(log_message)
  })
  autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox({
      title: "安装更新",
      message: '更新下载完毕，应用将重启并进行安装'
    }, () => {
      setImmediate(() => autoUpdater.quitAndInstall())
    })
  })
  const mainWindowConfig = {
    width: 1440,
    height: 768,
  }
  const urlLocation = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './index.html')}`
  mainWindow = new AppWindow(mainWindowConfig, urlLocation)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  //重点在下面这行，开启调试
  mainWindow.webContents.openDevTools()

  // set the menu
  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // open more window
  // new BrowserWindow().loadURL('https://www.baidu.com/')

  // hoop up main events
  ipcMain.on('open-settings-window', () => {
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow
    }
    const settingsFileLocation = `file://${path.join(__dirname, './settings/settings.html')}`
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
    // settingsWindow.webContents.openDevTools()
  })
  // 上传文件
  ipcMain.on('upload-file', (event, data) => {
    const manager = createManager()

    manager.uploadFile(data.key, data.path).then(data => {
      mainWindow.webContents.send('active-file-uploaded')
    }).catch((err) => {
      dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    })
  })
  // 下载文件
  ipcMain.on('download-file', (event, data) => {
    const manager = createManager()
    const filesObj = fileStore.get('files')
    const { key, path, id } = data
    manager.getStat(data.key).then((resp) => {
      // 转换成毫秒
      const serverUpdatedTime = Math.round(resp.putTime / 10000)
      const localUpdatedTime = filesObj[id].updatedAt
      if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
        // 服务器的文件比较新，从服务器去拉文件
        manager.downloadFile(key, path).then(() => {
          mainWindow.webContents.send('file-downloaded', { status: 'download-success', id })
        })
      } else {
        mainWindow.webContents.send('file-downloaded', { status: 'no-new-file', id })
      }
    }, (error) => {
      if (error.statusCode === 612) {
        // 文件不存在
        mainWindow.webContents.send('file-downloaded', { status: 'no-file', id })
      }
    })
  })
  // 上传所有文件
  ipcMain.on('upload-all-to-qiniu', () => {
    mainWindow.webContents.send('loading-status', true)
    setTimeout(() => {
      mainWindow.webContents.send('loading-status', false)
    }, 2500)
    // const manager = createManager()
    // const filesObj = fileStore.get('files') || {}
    // const uploadPromiseArr = Object.keys(filesObj).map(key => {
    //   const file = filesObj[key]
    //   return manager.uploadFile(`${file.title}.md`, file.path)
    // })
    // Promise.all(uploadPromiseArr).then(result => {
    //   console.log(result)
    //   // show uploaded message
    //   dialog.showMessageBox({
    //     type: 'info',
    //     title: `成功上传了${result.length}个文件`,
    //     message: `成功上传了${result.length}个文件`,
    //   })
    //   mainWindow.webContents.send('files-uploaded')
    // }).catch(() => {
    //   dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
    // }).finally(() => {
    //   mainWindow.webContents.send('loading-status', false)
    // })
  })
  // 动态菜单修改，保存后更新菜单状态
  ipcMain.on('config-is-saved', () => {
    // watch out menu items index for mac and windows
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
    const switchItems = (toggle) => {
      [1, 2, 3].forEach(number => {
        qiniuMenu.submenu.items[number].enabled = toggle
      })
    }
    const qiniuIsConfiged = ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key))
    if (qiniuIsConfiged) {
      switchItems(true)
    } else {
      switchItems(false)
    }
  })

  process.on('uncaughtException', (error) => {
    console.log('error:', error)
    // logger.info('error:', error)
  })
})