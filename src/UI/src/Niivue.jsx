import { useState } from 'react'
import { useRef } from 'react'
import { useEffect } from 'react'
import { io } from "socket.io-client"
import './Niivue.css'
import {Niivue} from "./niivue/dist/niivue.es.js" // niivue must be built for this file to exist (npm run build in niivue). This should be done for you automatically

let urlParams = new URLSearchParams(window.location.search)
let fileServerPort = urlParams.get('fileServerPort')
let socketServerPort = urlParams.get('socketServerPort')

console.log('fileServerPort', fileServerPort)
console.log('socketServerPort', socketServerPort)

const socket = io(`http://localhost:${socketServerPort}`)

const NiiVue = () => {
  const canvas = useRef()
  const [isFilled, setIsFilled] = useState(true)

  useEffect(() => {
    const nv = new Niivue({show3Dcrosshair: true})


    function onRemoveHaze(level){
      nv.removeHaze(level)
    }
    function onSetSliceType(sliceType){
      nv.setSliceType(sliceType)
    }

    function onScreenshot(){
      nv.saveScene()
    }

    async function isDrawingOpen(){
      console.log("fork", nv.drawBitmap);
      return (nv.drawBitmap !== null);
    }

    function onSaveDrawing(fnm){
      let url = `http://localhost:${fileServerPort}/file?filename=${fnm}`
      console.log('SaveDrawing', url);
      nv.saveImage(url);
    }

    function onCloseAllImages(){
      nv.volumes = []
      nv.overlays = []
      nv.meshes = []
      nv.closeDrawing()
      nv.drawScene()
    }

    function onDrawUndo(){
      nv.drawUndo()
    }

    function onShowColorbar(value){
      nv.opts.isColorbar = value
      nv.drawScene()
    }

    function onSetRadiological(value){
      nv.opts.isRadiologicalConvention = value
      nv.drawScene()
    }

    function onSetClipPlane(value){
      if (value){
        nv.setClipPlane([0.3, 270, 0])
      } else {
        nv.setClipPlane([2, 270, 0])
      }
      nv.drawScene()
    }

    function onDarkBackground(value){
      if (value){
        nv.opts.backColor = [0, 0, 0, 1]
      } else {
        nv.opts.backColor = [1, 1, 1, 1]
      }
      nv.drawScene()
    }

    function onWorldSpace(value){
      nv.setSliceMM(value);
    }

    function onSmooth(value){
      nv.setInterpolation(!value);
    }

    function onMoveCrosshair(value){
      switch (value) {
        case 'L':
          nv.moveCrosshairInVox(-1, 0, 0);
          break;
        case 'R':
          nv.moveCrosshairInVox(1, 0, 0);
          break
        case 'P':
          nv.moveCrosshairInVox(0, -1, 0);
          break
        case 'A':
          nv.moveCrosshairInVox(0, 1, 0);
          break
        case 'I':
          nv.moveCrosshairInVox(0, 0, -1);
          break
        case 'S':
          nv.moveCrosshairInVox(0, 0, 1);
          break
        default:
          break;
      }
    }

    function onSetPenValue(value){
      switch (value) {
        case 'Off':
          nv.setDrawingEnabled(false) 
          break;
        case 'Erase':
          nv.setDrawingEnabled(true)
          nv.setPenValue(0, isFilled)
          break
        case 'Red':
          nv.setDrawingEnabled(true)
          nv.setPenValue(1, isFilled)
          break
        case 'Green':
          nv.setDrawingEnabled(true)
          nv.setPenValue(2, isFilled)
          break
        case 'Blue':
          nv.setDrawingEnabled(true)
          nv.setPenValue(3, isFilled)
          break
        case 'Yellow':
          nv.setDrawingEnabled(true)
          nv.setPenValue(4, isFilled)
          break
        case 'Cyan':
          nv.setDrawingEnabled(true)
          nv.setPenValue(5, isFilled)
          break
        case 'Purple':
          nv.setDrawingEnabled(true)
          nv.setPenValue(6, isFilled)
          break
        case 'EraseCluster':
          nv.setDrawingEnabled(true)
          nv.setPenValue(-0, isFilled)
          break
        default:
          break;
      }
    }

    function onSetDrawFilled(value){
      setIsFilled(value)
      nv.setPenValue(nv.opts.penValue, value);
    }

    function onSetDrawOverwrite(value){
      nv.drawFillOverwrites = value
    }

    function onSetDrawTranslucent(value){
      if (value){
        nv.drawOpacity = 0.5
      } else {
        nv.drawOpacity = 1.0;
      }
      nv.drawScene()
    }

    function onDrawGrowCut(){
      nv.drawGrowCut()
    }

    function onDrawOtsu(value){
      nv.drawOtsu(value); //numeric: 2,3,4
    }

    function onSetDragType(value){
      switch(value) {
        case "dragNone":
          nv.opts.dragMode = nv.dragModes.none
          break
        case "dragContrast":
          nv.opts.dragMode = nv.dragModes.contrast
          break
        case "dragMeasure":
          nv.opts.dragMode = nv.dragModes.measurement
          break
        case "dragPan":
          nv.opts.dragMode = nv.dragModes.pan
          break
        case "dragSlicer3D":
          nv.opts.dragMode = nv.dragModes.slicer3D
          break
        default:
          break
      }
    }

    async function onAddFiles(filePaths){
      console.log(filePaths)
      filePaths.forEach(async (fileToLoad) => {
        let parts = fileToLoad.split('/')
        let name = parts[parts.length-1]
        let isMesh = nv.isMeshExt(name)
        let url = `http://localhost:${fileServerPort}/file?filename=${fileToLoad}`
        console.log(url)
        if (isMesh) {
          await nv.addMeshFromUrl({
            url: url,
            name: name
          })
        } else {
          await nv.addVolumeFromUrl({
            url: url,
            name: name
          })
        }
      })
    }

    async function onAddDrawing(filePaths){
      filePaths.forEach(async (fileToLoad) => {
        let parts = fileToLoad.split('/')
        //let name = parts[parts.length-1]
        let url = `http://localhost:${fileServerPort}/file?filename=${fileToLoad}`
        console.log("onAddDrawing", url)
        await nv.loadDrawingFromUrl(url)
      })
    }

    async function onAddStandard(standardFile){
      let url = `http://localhost:${fileServerPort}/standard/${standardFile}`
      console.log(url)
      await nv.addVolumeFromUrl({
        url: url,
        name: standardFile
      })
    }

    function onSyncImages(){
      console.log("onSyncImages")
      let value = []
      nv.volumes.forEach(element => {
        value.push(element.name)
      });
      socket.emit("syncImageList", value)
    }

    nv.onImageLoaded = onSyncImages;
    nv.onCloseAllImages = onSyncImages;

    nv.attachToCanvas(canvas.current)
    nv.loadVolumes([
      {url: `http://localhost:${fileServerPort}/standard/FLAIR.nii.gz`}
    ])
    socket.on("connect", () => {
      console.log('connected to socket',socket.id)
    });
    
    // register all of the event handlers
    
    socket.on("removeHaze", onRemoveHaze)
    socket.on("setSliceType", onSetSliceType)
    socket.on("screenshot", onScreenshot)
    socket.on("isDrawing", isDrawingOpen);
    socket.on("saveDrawing", onSaveDrawing)
    socket.on("closeAllImages", onCloseAllImages)
    socket.on("drawUndo", onDrawUndo)
    socket.on("showColorbar", onShowColorbar)
    socket.on('setRadiological', onSetRadiological)
    socket.on('setClipPlane', onSetClipPlane)
    socket.on('darkBackground', onDarkBackground)
    socket.on('worldSpace', onWorldSpace)
    socket.on('smooth', onSmooth)
    socket.on('moveCrosshair', onMoveCrosshair)
    socket.on('setPenValue', onSetPenValue)
    socket.on('setDrawFilled', onSetDrawFilled)
    socket.on('setDrawOverwrite', onSetDrawOverwrite)
    socket.on('setDrawTranslucent', onSetDrawTranslucent)
    socket.on('drawGrowCut', onDrawGrowCut)
    socket.on('drawOtsu', onDrawOtsu)
    socket.on('setDragType', onSetDragType)
    socket.on('addFiles', onAddFiles)
    socket.on('addStandard', onAddStandard)
    socket.on('addDrawing', onAddDrawing)

    socket.on('syncImages', onSyncImages)
    // When we want to emit messages later, rather than just listening...
    //socket.emit("someMessage", someData)
  }, [])

  return (
    <canvas ref={canvas} height={480} width={640} />
  )
}

export default NiiVue
