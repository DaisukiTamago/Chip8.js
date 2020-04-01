# Emulation-as-a-Service 

#### Node.Js Chip-8 Emulator Service

This project is a event driven chip-8 emulator running on server-side which sends output data to a Socket.IO client and offers simple API to interact with  
# Docs

Your Socket.IO client must implement the following code  
```javascript
//creates socket instance from Socket.IO
var socket = io("server url here, running in your local network should be somethin like http://localhost:12345")

//listen for server's output events
socket.on('display', PixelArray => {/**your code here**/ } )
socket.on('beep', ( ) => {/**your code here**/ } )
socket.on('getRomsResponse', RomsList => {/**your code here**/ } )

//emit events to server
socket.emit('getRoms')
socket.emit('loadRom', romName)
socket.emit('keyStateUpdate',  {value: keyValue, state: false})
```
## Events Description
#### Server's output
`Display` > This event receives the argument PixelArray, an Array of 2048 (Chip-8 original display has the size of 64 x 32) pixels that composes the screen, each pixel can be 0 (A background pixel, you don't have to render it) or 1 (A sprite pixel, must be rendered)  
`Beep` > When this event is trigerred, your client must emit some sound  
`GetRomsResponse` >This event receives an Array containing the name of all roms inside the /ROMS folder, you can put your own roms into this folder as well

#### Server's input
`getRoms` > Causes the server to activate "getRomsResponse" event  
`loadRom` > Causes server to load and run the rom with the which was passed as argument, the server will search by this rom in /ROMS folder  
`keyStateUpdate` > Chip-8 holds the state of 16 keys (keys are: 0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F) as user input, when one of these key is pressed or released, you must send to server an object {value: Integer, state: Boolean}, where value is any integer from 0 to 15, and state is a boolean where true means the key is pressed and 0 means the key is not pressed

*This emulator is still in progess, some roms may not run correctly and the emulator can show some inconsistency*

*Feel free to leave a pull request*

