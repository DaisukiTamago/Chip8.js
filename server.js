import express from 'express'
import socketIO from 'socket.io'
import Chip8 from './chip8.js'
import path from 'path'
import http from 'http'
import files from 'fs'

const __dirname = path.resolve()
var app = express()
var server = new http.Server(app)
var io = socketIO(server)
const PORT = 12345
var Chip8Instance = new Chip8()
Chip8Instance.setMaxListeners(0)

app.get('/', (req, res) => {
    res.send(`<center><strong>Chip-8 Service running... <br> You must acess with a socket io client, not with a http one</strong></center>`)
})

io.on('connection', socket => {

  Chip8Instance.on('display', (data) => {
      io.emit('display', data)
  })

  Chip8Instance.on('beep', () => {
      socket.emit('beep')
  })

  socket.on('pause', (isRunning) =>{
      Chip8Instance.isRunning = isRunning
  })

  socket.on('getRoms', () => {
    files.readdir(path.join(__dirname + '/ROMS'), (err, roms) => {
        socket.emit('getRomsResponse', roms)
    })
  })

  socket.on('loadRom', (rom) => {
      Chip8Instance.init(rom)
  })

  socket.on('keyStateUpdate', (keyUpdate) => {
    Chip8Instance.manageKeys(keyUpdate)
  })

})

server.listen(PORT, () => {
    console.log(`Running on port ${PORT}`)
})

