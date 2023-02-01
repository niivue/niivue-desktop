const parser = require('minimist')
const os = require('os');
const path = require('path');
const net = require('net');

class TcpServer {
  // 0 will result in a random open port being assigned 
  constructor(port = 0) {
    this.cliArgs = parser(process.argv, { default: { port: 0 } })
    this.port = this.cliArgs.port === 0 ? port : this.cliArgs.port
  }

  start() {
    process.send = process.send || function () {}
    this.server = net.createServer(function(socket) {
        socket.setEncoding('utf8')
        socket.on('data', (data)=>{
            let jsonMessage = JSON.parse(data)
            // console.log(jsonMessage)
            process.send(
            { 
                type: jsonMessage.type,
                value: jsonMessage.value
            }
            )
        })
        
        
    });
    this.server.listen(()=>{
        this.port = this.server.address().port // update port reference if it was randomly assigned
        console.log(`tcpServer listening at ${this.port}`)
        
    });
    
    return this
  }

  quit() {
    this.server.close((err) => {
      process.exit(err ? 1 : 0)
    })
  }
}

module.exports.TcpServer = TcpServer

const tcpServer = new TcpServer()
tcpServer.start()
