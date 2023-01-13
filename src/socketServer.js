const os = require('os')
const httpServer = require('http').createServer()
const socketio = require('socket.io')(httpServer, {
  cors: { origin: '*' }
})
const parser = require('minimist')

class SocketServer {
  constructor(port = 0) {
    this.cliArgs = parser(process.argv, { default: { port: 0 } })
    this.port = this.cliArgs.port === 0 ? port : this.cliArgs.port
    this.io = socketio
  }

  start() {
    let svr = httpServer.listen(this.port)
    this.port = svr.address().port
    this.io.on('connection', this.onConnection)
    console.log(`socketServer listening at ${this.port}`)
    process.send = process.send || function () {}
    process.send(
      {
        type: 'port',
        value: this.port
      }
    )
    process.on('message', (message)=>{
        console.log(message)
        socketio.to(message.socketID).emit(message.type, message.value)
    })
    return this
  }

  onConnection(socket) {
    socket.onAny((eventName, value)=>{
        process.send({
            type: eventName, 
            socketID: socket.id,
            value: value
        })
    })
    // send client connected event to establish socketID
    process.send({
        type: 'clientConnected', 
        socketID: socket.id,
        value: ''
    })
    console.log('client connected')
  }

  quit() {
    this.io.close()
  }

}
module.exports.SocketServer = SocketServer

const socketServer = new SocketServer()
socketServer.start()