const express = require('express');
const app = express()
const cors = require('cors')
const server = require('http').createServer(app);
const parser = require('minimist')
const os = require('os');
const path = require('path');

app.use(cors())
const staticFilePath = path.join(__dirname, 'UI', 'dist')
app.use('/gui', express.static(staticFilePath))

const standardFilePath = path.join(__dirname, 'images', 'standard')
app.use('/standard', express.static(standardFilePath))


app.use(express.json({limit: '25mb'}));
app.use(express.urlencoded({limit: '25mb'}));

app.get('/file', async function (req, res, next) {
  var fileName = req.query.filename
  if (typeof fileName === 'undefined') {
    res.send(`no filename given`)
    return
  }
  try {
    res.sendFile(fileName, function (err) {
      if (err) {
        next(err)
      } else {
      }
    })
  } catch (error) {
    res.send(`file not found: ${fileName}`)
  }

})

app.post('/file', jsonParser, async function(req, res) {
  console.log('file posted')
  console.log(req.query)
  const fileName = req.query.filename;
  const filePath = path.join(__dirname, fileName)
  fs.writeFileSync(filePath, JSON.stringify(req.body))
  res.sendStatus(200)
})


class FileServer {
  // 0 will result in a random open port being assigned 
  constructor(port = 0) {
    this.cliArgs = parser(process.argv, { default: { port: 0 } })
    this.port = this.cliArgs.port === 0 ? port : this.cliArgs.port
  }

  start() {
    this.server = server.listen(this.port)
    this.port = this.server.address().port // update port reference if it was randomly assigned
    console.log(`fileServer listening at ${this.port}`)
    process.send = process.send || function () {}
    process.send(
      { 
        type: 'port',
        value: this.port
      }
    )
    return this
  }

  quit() {
    this.server.close((err) => {
      process.exit(err ? 1 : 0)
    })
  }
}

module.exports.FileServer = FileServer

const fileServer = new FileServer()
fileServer.start()
