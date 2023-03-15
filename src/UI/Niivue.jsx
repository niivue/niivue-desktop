import { useState } from 'react'
import { useRef } from 'react'
import { useEffect } from 'react'
import React from 'react'
import { io } from "socket.io-client"
import './Niivue.css'
import { Niivue } from "@niivue"
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add'
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';

let urlParams = new URLSearchParams(window.location.search)
let fileServerPort = urlParams.get('fileServerPort')
let socketServerPort = urlParams.get('socketServerPort')

function makeColorGradients(colorMapValues) {
  let gradients = ''
  let c = colorMapValues
  let n = c.R.length
  gradients += `rgba(${c.R[n - 1]},${c.G[n - 1]},${c.B[n - 1]},${1})`
  gradients += `linear-gradient(90deg,`
  for (let j = 0; j < n; j++) {
    gradients += `rgba(${c.R[j]},${c.G[j]},${c.B[j]},${1}) ${(j / (n - 1)) * 100}%,`
  }
  gradients = gradients.slice(0, -1)
  gradients += ')'
  return gradients
}

function Layer(props) {
  const image = props.image
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [color, setColor] = React.useState(image.colorMap)
  let ArrowIcon = detailsOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
  let allColors = image.colorMaps().map((colorName) => {
    return (
      <MenuItem value={colorName} key={colorName}>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {colorName}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              width: '20%',
              ml: 'auto'
            }}
            style={{
              background: makeColorGradients(props.getColorMapValues(colorName))
            }}
          >
          </Box>

        </Box>
      </MenuItem>
    )
  })

  function handleDetails() {
    setDetailsOpen(!detailsOpen)
  }

  function handleColorChange(event) {
    let clr = event.target.value
    let id = image.id
    props.onColorMapChange(id, clr)
    setColor(clr)
  }

  function handleDelete() {
    props.onRemoveLayer(image)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          marginTop: 0.5,
          marginBottom: 0.5
        }}
      >
        <Box
          sx={{
            margin: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap', // useful for handling long file names
          }}
        >
          <Typography
            sx={{
              wordBreak: 'break-word', // wrap long names
              flexBasis: '75%' // allow for name wrapping for long names and alignment to the button
            }}
          >
            {image.name}
          </Typography>

          <IconButton
            onClick={handleDetails}
            style={{ marginLeft: 'auto' }}
          >
            {ArrowIcon}
          </IconButton>
        </Box>
        <Box
          sx={{
            display: detailsOpen ? 'flex' : 'none',
            flexDirection: 'column'
          }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%'
            }}
            m={1}
          >
            {/* <IconButton
            >
              <KeyboardDoubleArrowUpIcon />
            </IconButton>

            <IconButton
            >
              <KeyboardArrowUpIcon />
            </IconButton>

            <IconButton
            >
              <KeyboardArrowDownIcon />
            </IconButton>

            <IconButton
            >
              <KeyboardDoubleArrowDownIcon />
            </IconButton> */}

          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%'
            }}
            m={1}
          >
            <FormControl>
              <InputLabel>Color</InputLabel>
              <Select
                style={{ width: '200px' }}
                value={color}
                label='Color'
                size='small'
                onChange={handleColorChange}
              >
                {allColors}
              </Select>
            </FormControl>
            <IconButton
              onClick={handleDelete}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

function LayersPanel(props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: 'white',
        borderRight: '4px solid #e0e0e0',
        minWidth: 320,
        width: 320,
        maxWidth: 600,
        paddingTop: 4,
        marginLeft: 1
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <Button
          // onClick={handleAddLayer}
          endIcon={<AddIcon />}
          size='small'
          sx={{
            color: 'black',
            backgroundColor: 'white',
          }}
        >
          Add Layer
        </Button>
      </Box>
      {props.children}
    </Box>
  )
}

function NiiVue() {
  const canvas = useRef()
  const [isFilled, setIsFilled] = useState(true)
  const [socket, setSocket] = useState(null)
  const [nv, setNv] = useState(null)
  // const [layers, setLayers] = useState([])
  const [layerList, setLayerList] = useState([])
  function onImageLoaded(image) {
    // setLayers([...layers, image])
    let layers = nv.volumes
    // construct an array of <Layer> components. Each layer is a NVImage or NVMesh 
    setLayerList(layers.map((layer) => {
      return (
        <Layer
          key={layer.id}
          image={layer}
          onColorMapChange={onColorMapChange}
          onRemoveLayer={onRemoveLayer}
          colorMapValues={nv.colormapFromKey(layer.colorMap)}
          getColorMapValues={(colorMapName) => { return nv.colormapFromKey(colorMapName) }}
        />
      )
    })
    )
  }

  function onColorMapChange(id, clr) {
    nv.setColorMap(id, clr)
  }

  function onRemoveLayer(imageToRemove) {
    nv.removeVolume(imageToRemove)
    let layers = nv.volumes
    // construct an array of <Layer> components. Each layer is a NVImage or NVMesh 
    setLayerList(layers.map((layer) => {
      return (
        <Layer
          key={layer.id}
          image={layer}
          onColorMapChange={onColorMapChange}
          onRemoveLayer={onRemoveLayer}
          colorMapValues={nv.colormapFromKey(layer.colorMap)}
          getColorMapValues={(colorMapName) => { return nv.colormapFromKey(colorMapName) }}
        />
      )
    })
    )
  }

  // runs when the user initiates a remove haze event from the menu bar
  function onRemoveHaze(level) {
    nv.removeHaze(level)
  }

  // runs when the user changes the slice type from the menu bar
  function onSetSliceType(sliceType) {
    nv.setSliceType(sliceType)
  }

  // runs when the user initiates a screenshot event from the menu bar
  function onScreenshot() {
    nv.saveScene()
  }

  // check if a drawing is open
  async function isDrawingOpen() {
    return (nv.drawBitmap !== null);
  }

  // runs when the user ititiates a save drawing event from the menu bar
  function onSaveDrawing(fnm) {
    let url = `http://localhost:${fileServerPort}/file?filename=${fnm}`
    nv.saveImage(url);
  }

  // runs when the user chooses to close all images from the menu bar
  function onCloseAllImages() {
    nv.volumes = []
    nv.overlays = []
    nv.meshes = []
    nv.closeDrawing()
    nv.drawScene()
  }

  // runs when the user initiates an undo event using the app keyboard shortcuts
  function onDrawUndo() {
    nv.drawUndo()
  }

  // runs when the user initiates a show colorbar event from the menu bar
  function onShowColorbar(value) {
    nv.opts.isColorbar = value
    nv.drawScene()
  }

  // runs when the user initiates a set radiological convention event from the menu bar
  function onSetRadiological(value) {
    nv.opts.isRadiologicalConvention = value
    nv.drawScene()
  }

  // runs when the user initiates a set clip plane event from the menu bar
  function onSetClipPlane(value) {
    if (value) {
      nv.setClipPlane([0.3, 270, 0])
    } else {
      nv.setClipPlane([2, 270, 0])
    }
    nv.drawScene()
  }

  // runs when the user initiates a set dark background event from the menu bar
  function onDarkBackground(value) {
    if (value) {
      nv.opts.backColor = [0, 0, 0, 1]
    } else {
      nv.opts.backColor = [1, 1, 1, 1]
    }
    nv.drawScene()
  }

  // runs when the user initiates a set world space event from the menu bar
  function onWorldSpace(value) {
    nv.setSliceMM(value);
  }

  // runs when the user initiates a set smooth event from the menu bar
  function onSmooth(value) {
    nv.setInterpolation(!value);
  }

  // runs when the user uses keyboard shortcuts to move the crosshair (or menu bar buttons)
  function onMoveCrosshair(value) {
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

  // runs when the user initiates a set pen value event from the menu bar
  function onSetPenValue(value) {
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

  // runs when the user initiates a set draw filled event from the menu bar
  function onSetDrawFilled(value) {
    setIsFilled(value)
    nv.setPenValue(nv.opts.penValue, value);
  }

  // runs when the user initiates a set draw overwrite event from the menu bar
  function onSetDrawOverwrite(value) {
    nv.drawFillOverwrites = value
  }

  // runs when the user initiates a set draw translucent event from the menu bar
  function onSetDrawTranslucent(value) {
    if (value) {
      nv.drawOpacity = 0.5
    } else {
      nv.drawOpacity = 1.0;
    }
    nv.drawScene()
  }

  // runs when the user initiates grow cut event from the menu bar
  function onDrawGrowCut() {
    nv.drawGrowCut()
  }

  // runs when the user initiates a set draw otsu event from the menu bar
  function onDrawOtsu(value) {
    nv.drawOtsu(value); //numeric: 2,3,4
  }

  // runs when the user initiates a set drag type event from the menu bar
  function onSetDragType(value) {
    switch (value) {
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

  // runs when the user initiates adding files from the menu bar
  async function onAddFiles(filePaths) {
    filePaths.forEach(async (fileToLoad) => {
      let parts = fileToLoad.split('/')
      let name = parts[parts.length - 1]
      let isMesh = nv.isMeshExt(name)
      let url = `http://localhost:${fileServerPort}/file?filename=${fileToLoad}`
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

  // runs when the user initiates adding a drawing from the menu bar
  async function onAddDrawing(filePaths) {
    filePaths.forEach(async (fileToLoad) => {
      let parts = fileToLoad.split('/')
      //let name = parts[parts.length-1]
      let url = `http://localhost:${fileServerPort}/file?filename=${fileToLoad}`
      await nv.loadDrawingFromUrl(url)
    })
  }

  // runs when the user initiates adding a standard image from the menu bar
  async function onAddStandard(standardFile) {
    let url = `http://localhost:${fileServerPort}/standard/${standardFile}`
    await nv.addVolumeFromUrl({
      url: url,
      name: standardFile
    })
  }

  // only run once when component is mounted
  useEffect(() => {
    const sock = io(`http://localhost:${socketServerPort}`)
    setSocket(sock)
    // create a new Niivue instance
    let _nv = new Niivue(
      {
        show3Dcrosshair: true,
        isResizeCanvas: true
      }
    )
    setNv(_nv)
  }, [])

  // only run when nv is set
  useEffect(() => {
    if (nv !== null) {
      // let rect = canvas.current.parentNode.getBoundingClientRect()
      // canvas.current.width = rect.width
      // canvas.current.height = rect.height
      // link niivue to the canvas
      nv.attachToCanvas(canvas.current)
      // load mni152.nii.gz as the default image
      nv.loadVolumes([
        { url: `http://localhost:${fileServerPort}/standard/mni152.nii.gz` }
      ])

      // set the onImageLoaded callback
      nv.onImageLoaded = onImageLoaded
    }
  }, [nv])

  // only run when socket is set
  useEffect(() => {
    if (socket !== null) {
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
      // when the socket io connection is established, log it in the dev console
      socket.on("connect", () => {
        console.log('connected to socket', socket.id)
      });
      // When we want to emit messages later, rather than just listening...
      //socket.emit("someMessage", someData)
    }
    // clean up the socket connection when the component is unmounted
    return () => {
      setSocket(null)
    }
  }, [socket])

  return (
    <React.Fragment>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          maxWidth: "100vw",
          maxHeight: "100vh",
          minHeight: "100vh",
          margin: 0,
          minWidth: 0,
        }}
      >
        {/* ImagesPanel */}
        <LayersPanel>
          {layerList}
        </LayersPanel>

        {/* CanvasPanel */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            flexGrow: 3,
          }}
        >
          <canvas ref={canvas} />
        </Box>
      </Box>
    </React.Fragment>
  )
}

export default NiiVue
