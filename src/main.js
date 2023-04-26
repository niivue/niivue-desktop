const { app, BrowserWindow, Menu, MenuItem, systemPreferences, dialog } = require('electron')
const path = require('path')
const { fork } = require('child_process')
let win
let appMenuDefinition
const backgroundServices = []
let fileServerPort = null
let socketServerPort = null
let socketClientID = null
let fileServer = {}
let socketServer = {}
let tcpServer = {}

// app state is a global object shared throughout the main process methods
const appState = {
  isDrawing : false
}

const isMac = process.platform === 'darwin'
if (isMac) {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
}

function onIsDrawingOpen(value){
  appState.isDrawing = value
  menu.getMenuItemById('saveDrawing').enabled = value
  menu.getMenuItemById('drawUndo').enabled = value
}

function onFileServerPort(port) {
  fileServerPort = port
  // only create window when all subprocesses have been established. This is async
  if (
    fileServerPort !== null && socketServerPort !== null
  ) {
    // if the server dependencies are ready, show the browser window
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({
        fileServerPort: fileServerPort,
        socketServerPort: socketServerPort
      })
      onIsDrawingOpen()
      const inputs = parseCommandLineArgs()
      if (inputs.length > 0){
        onAddFiles(inputs)
      }
    }
  }
}

function onSocketServerPort(port) {
  socketServerPort = port
  // only create window when all subprocesses have been established. This is async
  if (
    fileServerPort !== null && socketServerPort !== null
  ) {
    // if the server dependencies are ready, show the browser window
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow({
        fileServerPort: fileServerPort,
        socketServerPort: socketServerPort
      })
      onIsDrawingOpen()
      const inputs = parseCommandLineArgs()
      if (inputs.length > 0){
        onAddFiles(inputs)
      }
    }
  }
}

function onExampleMessage(message){
  /*
  a message sent to the socketServer process must have the form:
  {
    type: 'string',
    socketID: 'string', // from sender
    value: Object
  }
  */
  socketServer.send(
    {
      type: message.type,
      socketID: message.socketID,
      value: 'someValue'
    }
  )
}

function handleFileServerMessage(message) {
  // msg is expected to be a JSON object (automatically serialized and deserialized by process.send and 'message')
  if (message.type === 'port') {
    onFileServerPort(message.value)
  }
}

function handleTcpServerMessage(message) {
  // msg is expected to be a JSON object (automatically serialized and deserialized by process.send and 'message')
  if (message.type === 'port') {
    //onFileServerPort(message.value)
  } else {
    //print the message for now
    console.log('tcp message: ', message)
  }
}

function handleSocketServerMessage(message) {
  // msg is expected to be a JSON object (automatically serialized and deserialized by process.send and 'message')
  socketClientID = message.socketID
  switch (message.type) {
    case 'port':
      onSocketServerPort(message.value)  
      break
    case 'isDrawingOpen':
      onIsDrawingOpen(message.value)
      break
    case 'SOME OTHER MESSAGE HERE':
      // do something
      break
    default:
      console.log('unsupported message', message.type)
  }
}

function getAppPath() {
  const appLoc = app.getAppPath('exe')
  let fullAppPath = path.dirname(appLoc)
  if (process.platform === 'darwin') {
    // on mac, the app path is the .app folder, not the executable
    fullAppPath = path.join(
      path.dirname(fullAppPath),
      'MacOS',
      // app.name
    )
  }
  console.log('appPath', fullAppPath)
  return fullAppPath
}

function onInstallCLI() {
  const appPath = getAppPath()
  // const cliPath = path.join(appPath, 'resources', 'cli', 'niivue')
  // const cliInstallPath = '/usr/local/bin/niivue'
  // const fs = require('fs')
  // fs.copyFile(cliPath, cliInstallPath, (err) => {
    // if (err) throw err;
    // console.log('niivue was copied to /usr/local/bin');
  // });

  // add appPath to the user's PATH in the current SHELL
  const { exec } = require('child_process')
  if (process.platform === 'darwin') {
    exec(`echo '\n#NiiVue path for CLI usage\nexport PATH=$PATH:${appPath}\n' >> ~/.zprofile`, (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        console.log('error', err)
        return
      }
      // the *entire* stdout and stderr (buffered)
      console.log(`stdout: ${stdout}`)
      console.log(`stderr: ${stderr}`)
    })
  }
}

function parseCommandLineArgs() {
  const args = process.argv.slice(1)
  const imagesToLoad = onCommandLineArgs(args)
  return imagesToLoad
}

function convertArgToNiiVueKey(arg) {
  switch (arg) {
    case 'colormap':
      return 'colorMap'
    case 'input':
      return 'url'
    case 'min':
      return 'cal_min'
    case 'max':
      return 'cal_max'
    case 'opacity':
      return 'opacity'
    default:
      return ''
  }
}

function onCommandLineArgs(args) {
  // loop through args and find all --input flag and create objects for them.
  // each flag after --input should be a new property of the object until the next --input flag
  // if the next flag is --input, then create a new object
  // if the next flag is not --input, then add it as a property of the current object
  const imagesToLoad = []
  var obj = {}
  let imageID = -1
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') {
      imageID += 1
      var obj = {}
      obj[convertArgToNiiVueKey('input')] = args[i + 1]
      imagesToLoad.push(obj)
    }
    if (args[i].startsWith('--')) {
      // add the next arg as a property of the object
      let argName = args[i].replace('--','')
      argName = convertArgToNiiVueKey(argName)
      // if argName is not empty (i.e. it is a valid arg that NiiVue knows about)
      if (argName !== ''){
        imagesToLoad[imageID][argName] = args[i + 1]
      }
    }
  }
  console.log(imagesToLoad)
  return imagesToLoad
}

function onViewModeClick(viewMode){
  socketServer.send(
    {
      type: 'setSliceType',
      socketID: socketClientID,
      value: viewMode
    }
  )
}

function onRemoveHaze() {
    dialog.showMessageBox(
      win,
      {
        message: "Image segmentation classes:",
        buttons: ["1 only bright voxels survive", "2", "3", "4", "5 dim voxels survive"],
        defaultId: 4, // bound to buttons array
        cancelId: -1 // bound to buttons array
      })
      .then(result => {
        socketServer.send(
        {
          type: 'removeHaze',
          socketID: socketClientID,
          value: result.response + 2
        })
      }
    );
}

function onScreenshotClick(){
  socketServer.send(
    {
      type: 'screenshot',
      socketID: socketClientID,
      value: null
    }
  )
}

async function onSaveDrawingClick(){

  let isDraw = appState.isDrawing
  if (!isDraw) {
    dialog.showMessageBox(win, {
      message: 'No drawing is open',
      type: 'info',
    });
    return;
  }
  const options = {
    defaultPath: path.join(app.getPath('documents'), 'drawing.nii'),
  }
  const pObj = dialog.showSaveDialog(win, options);
  pObj.then(
    onResolved => {
      if (!onResolved.canceled) {
          filename = onResolved.filePath;
          socketServer.send(
            {
              type: 'saveDrawing',
              socketID: socketClientID,
              value: filename
            }
          );
      }
    },
    onRejected => {console.log('Promise rejected')}
  );
}


function onCloseAllImages(){
  socketServer.send(
    {
      type: 'closeAllImages',
      socketID: socketClientID,
      value: null
    }
  )
}

function onDrawUndo(){
  socketServer.send(
    {
      type: 'drawUndo',
      socketID: socketClientID,
      value: null
    }
  )
}

function onSagittalNoseLeft(){
  socketServer.send(
    {
      type: 'sagittalNoseLeft',
      socketID: socketClientID,
      value: menu.getMenuItemById('sagittalNoseLeft').checked 
    }
  )
}

function onShowColorbarClick(){
  socketServer.send(
    {
      type: 'showColorbar',
      socketID: socketClientID,
      value: menu.getMenuItemById('colorbar').checked 
    }
  )
}

function onSetRadiological(){
  socketServer.send(
    {
      type: 'setRadiological',
      socketID: socketClientID,
      value: menu.getMenuItemById('radiological').checked 
    }
  )
}

function onSetClipPlane(){
  socketServer.send(
    {
      type: 'setClipPlane',
      socketID: socketClientID,
      value: menu.getMenuItemById('clipPlane').checked 
    }
  )
}

function onDarkBackground(){
  socketServer.send(
    {
      type: 'darkBackground',
      socketID: socketClientID,
      value: menu.getMenuItemById('background').checked 
    }
  )
}

function onWorldSpace(){
  socketServer.send(
    {
      type: 'worldSpace',
      socketID: socketClientID,
      value: menu.getMenuItemById('worldSpace').checked 
    }
  )
}

function onSmooth(){
  socketServer.send(
    {
      type: 'smooth',
      socketID: socketClientID,
      value: menu.getMenuItemById('smooth').checked 
    }
  )
}

function onMoveCrosshair(value){
  socketServer.send(
    {
      type: 'moveCrosshair',
      socketID: socketClientID,
      value: value
    }
  )
}

function onSetPenValue(value){
  socketServer.send(
    {
      type: 'setPenValue',
      socketID: socketClientID,
      value: value
    }
  )
}

function onSetDrawFilled(){
  socketServer.send(
    {
      type: 'setDrawFilled',
      socketID: socketClientID,
      value: menu.getMenuItemById('drawFilled').checked
    }
  ) 
}

function onSetDrawOverwrite(){
  socketServer.send(
    {
      type: 'setDrawOverwrite',
      socketID: socketClientID,
      value: menu.getMenuItemById('drawOverwrite').checked
    }
  ) 
}

function onSetDrawTranslucent(){
  socketServer.send(
    {
      type: 'setDrawTranslucent',
      socketID: socketClientID,
      value: menu.getMenuItemById('drawTranslucent').checked
    }
  ) 
}

function onDrawGrowCut(){
  socketServer.send(
    {
      type: 'drawGrowCut',
      socketID: socketClientID,
      value: null
    }
  ) 
}

function onDrawOtsu(){
  dialog.showMessageBox(
    win,
    {
      message: "Image segmentation classes:",
      buttons: ["2", "3", "4"],
      defaultId: 1, // bound to buttons array
      cancelId: -1 // bound to buttons array
    })
    .then(result => {
      socketServer.send(
        {
          type: 'drawOtsu',
          socketID: socketClientID,
          value: result.response + 2
        }
      ) 
    }
  );
}

function onDragClick(value){
  socketServer.send(
    {
      type: 'setDragType',
      socketID: socketClientID,
      value: value
    }
  ) 
}

function onAddDrawing(filename){
  console.log('onAddDrawing');
  socketServer.send(
    {
      type: 'addDrawing',
      socketID: socketClientID,
      value: filename
    }
  )
}

function onAddStandard(standardFile){
  socketServer.send(
    {
      type: 'addStandard',
      socketID: socketClientID,
      value: standardFile
    }
  )
}

function onAddFiles(filePaths){
  // check if first item in filePaths is an object or a string
  // if string, convert to an object
  if (typeof filePaths[0] === 'string'){
    filePaths = filePaths.map((path)=>{
      return {url: path} // assume all other properties are default if only string paths provided rather than objects
    })
  }
  console.log('filePaths', filePaths)
  setTimeout(()=>{

    socketServer.send(
      {
        type: 'addFiles',
        socketID: socketClientID,
        value: filePaths
      }
    )
  }, 2000)
}


// launch the fileServer as a background process
fileServer = fork(
  path.join(__dirname, 'fileServer.js'),
  [`--port=0`, `--host=${'localhost'}`],
  { env: {FORK: true} }
)
// launch the socketServer as a background process
socketServer = fork(
  path.join(__dirname, 'socketServer.js'),
  [`--port=0`, `--host=${'localhost'}`],
  { env: {FORK: true} }
)

tcpServer = fork(
  path.join(__dirname, 'tcpServer.js'),
  [`--port=0`, `--host=${'localhost'}`],
  { env: {FORK: true} }
)
// add both file server and socket server to our list of open background services (for exiting later)
backgroundServices.push(fileServer)
backgroundServices.push(socketServer)
backgroundServices.push(tcpServer)

fileServer.on('message', (message) => {
  handleFileServerMessage(message)
})

socketServer.on('message', (message) => {
  handleSocketServerMessage(message)
})

tcpServer.on('message', (message) => {
  handleTcpServerMessage(message)
})

function createWindow(config={}) {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  win = new BrowserWindow({
    width: Math.round(width * 0.75),
    height: height,
    minWidth: Math.round(width * 0.25),
    minHeight: Math.round(height * 0.5),
    title: "NiiVue",
    webPreferences: {
      //preload: path.join(__dirname, 'preload.js')
    }
  })
  if (process.env.NIIVUE_DEV_LAUNCH_DELAY){
    let viteDevPort = 8899 // could be read from an env var in the future
    console.log('viteDevPort', viteDevPort)
    let url = `http://localhost:${viteDevPort}?fileServerPort=${config.fileServerPort}&socketServerPort=${config.socketServerPort}`
    setTimeout(()=>{
      win.loadURL(url)
    }, Number(process.env.NIIVUE_DEV_LAUNCH_DELAY))
  } else {
    let url = `http://localhost:${fileServerPort}/gui/index.html?fileServerPort=${config.fileServerPort}&socketServerPort=${config.socketServerPort}`
    win.loadURL(url)
  }
}

app.whenReady().then(() => {
  if (BrowserWindow.getAllWindows().length === 0 && fileServerPort !== null && socketServerPort !== null) {
    createWindow({
      fileServerPort: fileServerPort,
      socketServerPort: socketServerPort
    })
    onIsDrawingOpen()
    const inputs = parseCommandLineArgs()
    if (inputs.length > 0){
      onAddFiles(inputs)
    }
    
  }
  getAppPath()
  Menu.setApplicationMenu(menu)
  app.on('open-file', function(ev, path) { // recentdocuments event
    onAddFiles([path])
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && fileServerPort !== null && socketServerPort !== null) {
      createWindow({
        fileServerPort: fileServerPort,
        socketServerPort: socketServerPort
      })
      onIsDrawingOpen()
      const inputs = parseCommandLineArgs()
      if (inputs.length > 0){
        onAddFiles(inputs)
      }
    }
  })
})

app.on('window-all-closed', () => {
  backgroundServices.forEach((service) => {
    service.kill()
  })
  app.quit()
})

appMenuDefinition = [
  ...(isMac ? [{
    label: 'NiiVue',
    submenu: [
      { label: 'About',
        click: () => {
          // do nothing for now. Eventually show a dialog here. 
        },
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  {
    label: 'File',
    submenu: [
      { label: 'Add' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A',
        click: () => {
            dialog.showOpenDialog(win, {
                properties: ["openFile", "multiSelections"],
            }).then(result => {
              console.log('got there')
                if (result.canceled === true){
                  console.log('cancelled')
                } else {
                  for (let i = 0; i < result.filePaths.length; i++) 
                    app.addRecentDocument(result.filePaths[i])
                  onAddFiles(result.filePaths)
                }
            });
          },
      },
      { label: 'Add Volumes' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A',
        click: () => {
            dialog.showOpenDialog(win, {
                properties: ["openFile", "multiSelections"],
                filters: [
                  {name: 'volumes', extensions: ['nii.gz', 'nii', 'mgh', 'mgz']}
                ]
            }).then(result => {
              console.log('got here')
                if (result.canceled === true){
                  console.log('cancelled')
                } else {
                  for (let i = 0; i < result.filePaths.length; i++) 
                    app.addRecentDocument(result.filePaths[i])
                  onAddFiles(result.filePaths)
                }
            });
          },
      },
      {
        label: 'Add Standard',
        submenu: [
          { label: 'mni152.nii.gz' ,
            click: ()=>{onAddStandard('mni152.nii.gz')},
          },
          { label: 'FLAIR' ,
            click: ()=>{onAddStandard('FLAIR.nii.gz')},
          },
        ]
      }, 
      { label: 'Add Drawing' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+D' : 'Ctrl+D',
        click: () => {
            dialog.showOpenDialog( {
                properties: ["openFile"],
                filters: [
                  {name: 'volumes', extensions: ['nii.gz', 'nii', 'mgh', 'mgz']}
                ]
            }).then(result => {
                if (result.canceled === false){
                  onAddDrawing(result.filePaths)
                }
                    //win.webContents.send('addDrawing', result.filePaths);
            });
          },
      },
      {
        "label":"Add Recent",
        "role":"recentdocuments",
        "submenu":[
          {
            "label":"Clear Recent",
            "role":"clearrecentdocuments"
          }
        ]
      },
      { label: 'Save Drawing' , 
        id: 'saveDrawing',
        accelerator: process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S',
        click: onSaveDrawingClick
      },
      { label: 'Take Screenshot' , 
        click: onScreenshotClick
      }, 
      { label: 'Close All Files' , 
        click: onCloseAllImages
      },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // {
  //   label: 'Images',
  //   id: 'images',
  //   submenu:[
  //     {
  //       label: 'test'
  //     }
  //   ]

  // },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo Draw' ,
        id: 'drawUndo',
        accelerator: process.platform === 'darwin' ? 'Cmd+Z' : 'Ctrl+Z',
        click: onDrawUndo
      },
    ]
  },
  // view menu
  {
    label: 'View',
    submenu: [
      { label: 'Axial' , 
        type: 'radio',
        click: () => {
            onViewModeClick(0)
          },
      },
      { label: 'Coronal' , 
      type: 'radio',
        click: () => {
            onViewModeClick(1)
          },
      },
      { label: 'Sagittal' , 
      type: 'radio',
        click: () => {
            onViewModeClick(2)
          },
      },
      { label: 'Render' , 
      type: 'radio',
        click: () => {
            onViewModeClick(4)
          },
      },
      { label: 'A+C+S+R' , 
      type: 'radio',
      checked:true,
        accelerator: 'Alt+M',
        click: () => {
            onViewModeClick(3)
          },
      },
      { type: 'separator' },
      { label: 'Colorbar' ,
        type: 'checkbox',
        id: 'colorbar',
        checked: false,
        click: onShowColorbarClick
      },
      { label: 'Radiological' ,
        type: 'checkbox',
         id: 'radiological',
        checked: false,
        click: onSetRadiological
      },
      {
        label: 'Sagittal Nose Left',
        type: 'checkbox',
        id: 'sagittalNoseLeft',
        checked: false,
        click: onSagittalNoseLeft
      },
      { label: 'Render Clip Plane' ,
        type: 'checkbox',
         id: 'clipPlane',
        checked: false,
        click: onSetClipPlane
      },
      { label: 'Dark Background' ,
        type: 'checkbox',
         id: 'background',
        checked: true,
        click: onDarkBackground
      },
      { label: 'World Space' ,
        type: 'checkbox',
        id: 'worldSpace',
        checked: false,
        click: onWorldSpace
      },
      { label: 'Smooth' ,
        type: 'checkbox',
        id: 'smooth',
        checked: true,
        click: onSmooth
      },
      { type: 'separator' },
      { label: 'Left' , 
        accelerator: 'Alt+L',
        click: () => {
            onMoveCrosshair('L')
          },
      },
      { label: 'Right' , 
        accelerator: 'Alt+R',
        click: () => {
            onMoveCrosshair('R')
          },
      },
      { label: 'Posterior' , 
        accelerator: 'Alt+P',
        click: () => {
            onMoveCrosshair('P')
          },
      },
      { label: 'Anterior' , 
        accelerator: 'Alt+A',
        click: () => {
            onMoveCrosshair('A')
          },
      },
      { label: 'Inferior' , 
        accelerator: 'Alt+I',
        click: () => {
            onMoveCrosshair('I')
          },
      },
      { label: 'Superior' , 
        accelerator: 'Alt+S',
        click: () => {
            onMoveCrosshair('S')
          },
      },
      { label: 'Remove Haze' ,
        click: onRemoveHaze
      },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  //draw Menu
  {
    label: 'Draw',
    submenu: [
      { label: 'Off' ,
        id: 'Off',
        accelerator: 'Alt+0',
        checked: true,
        type: 'radio',
        click: ()=>{onSetPenValue('Off')}
      },
      { label: 'Red' ,
        id: 'Red',
        type: 'radio', 
        accelerator: 'Alt+1',
        click: ()=>{onSetPenValue('Red')}
      },
      { label: 'Green',
        id: 'Green',
        type: 'radio',
        accelerator: 'Alt+2',
        click: ()=>{onSetPenValue('Green')}
      },
      { label: 'Blue',
        id: 'Blue',
        type: 'radio',
        accelerator: 'Alt+3',
        click: ()=>{onSetPenValue('Blue')}
      },
      { label: 'Yellow',
        id: 'Yellow',
        type: 'radio',
        accelerator: 'Alt+4',
        click: ()=>{onSetPenValue('Yellow')}
      },
      { label: 'Cyan',
        id: 'Cyan',
        type: 'radio',
        accelerator: 'Alt+5',
        click: ()=>{onSetPenValue('Cyan')}
      },
      { label: 'Purple',
        id: 'Purple',
        type: 'radio',
        accelerator: 'Alt+6',
        click: ()=>{onSetPenValue('Purple')}
      },
      { label: 'Erase',
        id: 'Erase',
        type: 'radio',
        accelerator: 'Alt+7',
        click: ()=>{onSetPenValue('Erase')}
      },
      { label: 'Erase Cluster',
        id: 'EraseCluster',
        type: 'radio',
        accelerator: 'Alt+8',
        click: ()=>{onSetPenValue('EraseCluster')}
      },
      { type: 'separator' },
      { label: 'Draw Filled' ,
        type: 'checkbox',
         id: 'drawFilled',
        checked: true,
        click: onSetDrawFilled
      },
      { label: 'Draw Overwrites Existing' ,
        type: 'checkbox',
         id: 'drawOverwrite',
        checked: true,
        click: onSetDrawOverwrite
      },
      { label: 'Translucent' ,
        type: 'checkbox',
         id: 'drawTranslucent',
        checked: true,
        click: onSetDrawTranslucent
      },
      { label: 'Otsu Segmentation' ,
        click: onDrawOtsu
      },
      { label: 'Grow Cut' , 
        click: onDrawGrowCut
      },
    ]
  },
  //Drag menu
  {
    label: 'Drag',
    submenu: [
      { label: 'Contrast' ,
        type: 'radio',
         id: 'dragContrast',
        checked: true,
        click: ()=>{onDragClick('dragContrast')}
      },
      { label: 'Measure' ,
        type: 'radio',
         id: 'dragMeasure',
        checked: false,
        click: ()=>{onDragClick('dragMeasure')}
      },
      { label: 'Pan' ,
        type: 'radio',
         id: 'dragPan',
        checked: false,
        click: ()=>{onDragClick('dragPan')}
      },
      { label: 'Slicer3D' ,
        type: 'radio',
         id: 'dragPan',
        checked: false,
        click: ()=>{onDragClick('dragSlicer3D')}
      },
      { label: 'None' ,
        type: 'radio',
         id: 'dragNone',
        checked: false,
        click: ()=>{onDragClick('dragNone')}
      },
    ]
  },
  // Window menu
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { role: 'reload' },
      { role: 'forceReload' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  //Develop menu
  {
    label: 'Develop',
    submenu: [
      {
        label: 'Code',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://github.com/niivue/niivue')
        }
      },
      {
        label: 'Install CLI to PATH',
        click: async () => {
          onInstallCLI()
        }
      },
      {
        label: 'Documentation',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://niivue.github.io/niivue/devdocs/')
        }
      },
      {
        label: 'Tools',
        role: 'toggleDevTools' //openDevTools, closeDevTools
      },
      
    ]
  }
]

const menu = Menu.buildFromTemplate(appMenuDefinition)