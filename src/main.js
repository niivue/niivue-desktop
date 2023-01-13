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

const isMac = process.platform === 'darwin'
if (isMac) {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
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

function handleSocketServerMessage(message) {
  // msg is expected to be a JSON object (automatically serialized and deserialized by process.send and 'message')
  socketClientID = message.socketID
  switch (message.type) {
    case 'port':
      onSocketServerPort(message.value)  
      break
    case 'SOME OTHER MESSAGE HERE':
      // do something
      break
    default:
      console.log('unsupported message', message.type)
  }
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

function onScreenshotClick(){
  socketServer.send(
    {
      type: 'screenshot',
      socketID: socketClientID,
      value: null
    }
  )
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
  console.log('filePaths', filePaths)
  socketServer.send(
    {
      type: 'addFiles',
      socketID: socketClientID,
      value: filePaths
    }
  ) 
  // experimental dynamic adding images to "images" menu item
  // will reqire more work
  if (false){
    let appMenu = Menu.getApplicationMenu()
    filePaths.forEach((image)=>{
      let newItem = new MenuItem({
        label: image,
        click: ()=>{console.log('clicked', image)},
        submenu:[
          {
            label: 'move to top'
          },
          {
            label: 'move to bottom'
          },
          {
            label: 'move up',
          },
          {
            label: 'move down'
          },
          {
            label: 'visible'
          }
        ]
      })
      appMenu.items.find((item) => item.id === "images").submenu.append(newItem)
      Menu.setApplicationMenu(appMenu)
    })
  }
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
// add both file server and socket server to our list of open background services (for exiting later)
backgroundServices.push(fileServer)
backgroundServices.push(socketServer)

fileServer.on('message', (message) => {
  handleFileServerMessage(message)
})

socketServer.on('message', (message) => {
  handleSocketServerMessage(message)
})

function createWindow(config={}) {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "NiiVue",
    webPreferences: {
      //preload: path.join(__dirname, 'preload.js')
    }
  })
  if (process.env.NIIVUE_DEV_LAUNCH_DELAY){
    let url = `http://localhost:8080?fileServerPort=${config.fileServerPort}&socketServerPort=${config.socketServerPort}`
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
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && fileServerPort !== null && socketServerPort !== null) {
      createWindow({
        fileServerPort: fileServerPort,
        socketServerPort: socketServerPort
      })
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
      { label: 'Add volumes' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+A' : 'Ctrl+A',
        click: () => {
            dialog.showOpenDialog(win, {
                properties: ["openFile", "multiSelections"],
                filters: [
                  {name: 'volumes', extensions: ['nii.gz', 'nii']}
                ]
            }).then(result => {
              console.log('got here')
                if (result.canceled === true){
                  console.log('cancelled')
                } else {
                  console.log(result.filePaths)
                  onAddFiles(result.filePaths)
                }
            });
          },
      },
      {
        label: 'Add standard',
        submenu: [
          { label: 'mni152.nii.gz' ,
            click: ()=>{onAddStandard('mni152.nii.gz')},
          },
        ]
      }, 
      { label: 'Add Drawing' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+D' : 'Ctrl+D',
        click: () => {
            dialog.showOpenDialog( {
                properties: ["openFile"]
            }).then(result => {
                if (result.canceled === false){

                }
                    //win.webContents.send('addDrawing', result.filePaths);
            });
          },
      },
      { label: 'Save Drawing' , 
        accelerator: process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S',
        click: () => { 
          //win.webContents.send('drawSave', 'draw.nii');
        },
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
      { label: 'Erase',
        id: 'Erase',
        type: 'radio',
        accelerator: 'Alt+4',
        click: ()=>{onSetPenValue('Erase')}
      },
      { label: 'Erase Cluster',
        id: 'EraseCluster',
        type: 'radio',
        accelerator: 'Alt+5',
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
let menu = Menu.buildFromTemplate(appMenuDefinition)
Menu.setApplicationMenu(menu)