import fs from 'fs'
import {default as delta_time} from 'delta-time'
import {EventEmitter} from 'events';


function toHex(num){
    return num.toString(16)
}

function toBin(num){
    return num.toString(2)
}

function getNibble(instruction, index){
    return (instruction >> (index*4)&0xf)
}

function getAdress(instruction){
    return (instruction & 0xfff)
}

function getByte(instruction){
    return (instruction & 0xff)
}

class Chip8 extends EventEmitter {

    graphics = new Array(64*32)
    program_counter =  0x200
    actual_opcode = 0b0000000000000000
    I = 0x0000
    stack_pointer = 0x0000
    stack = new Array(16)
    memory =  new Array(4096)
    registers = new Array(16)
    keyState = new Array(16)
    drawFlag = false
    sound_timer = 0
    jumpFlag = false
    delay_timer = 0
    isRunning = true
    chip8_fontset =
    [
        0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
        0x20, 0x60, 0x20, 0x20, 0x70, // 1
        0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
        0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
        0x90, 0x90, 0xF0, 0x10, 0x10, // 4
        0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
        0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
        0xF0, 0x10, 0x20, 0x40, 0x40, // 7
        0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
        0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
        0xF0, 0x90, 0xF0, 0x90, 0x90, // A
        0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
        0xF0, 0x80, 0x80, 0x80, 0xF0, // C
        0xE0, 0x90, 0x90, 0x90, 0xE0, // D
        0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
        0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ]

    reset(){
        this.graphics.fill(0)
        this.program_counter =  0x200
        this.actual_opcode = 0b0000000000000000
        this.I = 0x0000
        this.stack_pointer = 0x0000
        this.stack.fill(0)
        this.memory.fill(0)
        this.registers.fill(0)
        this.keyState.fill(0)
        this.chip8_fontset.forEach((el, index) => {
            this.memory[index] = el
        })
        this.sound_timer = 0
        this.delay_timer = 0
        this.drawFlag = false
        this.jumpFlag = false
        this.isRunning = true
    }

    manageKeys(keyUpdate){
        let {value, state} = keyUpdate
        if(value >= 0 && value <= 15){
            this.keyState[value] = state
            this.emit('keyUpdated', value)
        }
    }

    loadRom(rom_name){
        let rom_buffer_file = fs.readFileSync(`ROMS/${rom_name}`)
        let rom_buffer_view =  new Uint8Array(rom_buffer_file)

        rom_buffer_view.forEach((actual_byte, index) => {
            this.memory[0x200 + index] = actual_byte
        })
    }

    cpuCycle(){
        if(this.isRunning){

            this.actual_opcode = (this.memory[this.program_counter] << 8 | this.memory[this.program_counter + 1])
            this.execute_opcode()
            if(this.jumpFlag == false){
                this.program_counter += 2
            }
            console.log(toHex(this.actual_opcode));
            
            if(this.drawFlag){
                this.emit('display', {data: this.graphics})
                this.drawFlag = false
            }
            if(this.delay_timer > 0){
                --this.delay_timer
            }
            if(this.sound_timer > 0){
                if(this.sound_timer == 1){
                    this.emit('beep')
                }
                --this.sound_timer
            }
        }
    }

    execute_opcode(){
        let x = getNibble(this.actual_opcode, 2)
        let y = getNibble(this.actual_opcode, 1)
        this.registers.forEach((value, index) => this.registers[index] &= 0xFF)
        this.jumpFlag = false

        if(toHex(this.actual_opcode & 0xf000) == 0){
            if(toHex(this.actual_opcode & 0xffff) == 'e0'){
                this.graphics.fill(0)
                this.drawFlag = true
            } 
            else if (toHex(this.actual_opcode & 0xffff) == 'ee') {
                this.program_counter = this.stack[--this.stack_pointer]
            }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 1000){
            this.program_counter = getAdress(this.actual_opcode)
            this.jumpFlag = true
        }
        else if(toHex(this.actual_opcode & 0xf000) == 2000){
            this.stack[this.stack_pointer] = this.program_counter
            this.stack_pointer++
            this.program_counter = getAdress(this.actual_opcode)
            this.jumpFlag = true
        }
        else if(toHex(this.actual_opcode & 0xf000) == 3000){
            if(this.registers[x] == getByte(this.actual_opcode)){
                this.program_counter+=2
            }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 4000){
            if(this.registers[x] != getByte(this.actual_opcode)){
                this.program_counter+=2
            }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 5000){
           if(this.registers[x] == this.registers[y]){
               this.program_counter += 2
           }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 6000){
            this.registers[x] = getByte(this.actual_opcode)
        }
        else if(toHex(this.actual_opcode & 0xf000) == 7000){
            this.registers[x] = this.registers[x] + getByte(this.actual_opcode)
        }
        else if(toHex(this.actual_opcode & 0xf000) == 8000){
            if(toHex(this.actual_opcode & 0x000f) == 0){
                this.registers[x] = this.registers[y]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 1){
                this.registers[x] = this.registers[x] | this.registers[y]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 2){
                this.registers[x] = this.registers[x] & this.registers[y]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 3){
                this.registers[x] = this.registers[x] ^ this.registers[y]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 4){
                if((this.registers[x] + this.registers[y]) > 255){
                    this.registers[0xF] = 1
                } else {
                    this.registers[0xF] = 0
                }
                this.registers[x] = (this.registers[x] + this.registers[y]) & 0xFF
            }
            else if(toHex(this.actual_opcode & 0x000f) == 5){
                this.registers[0xF] = (this.registers[x] > this.registers[y] ? 1 : 0);
                this.registers[x] -= this.registers[y]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 6){
                this.registers[0xF] = this.registers[x] & 0x1 ? 1 : 0
                this.registers[x] >>= 1 
            }
            else if(toHex(this.actual_opcode & 0x000f) == 7){
                if((this.registers[y] - this.registers[x]) < 0){
                    this.registers[0xf] = 0
                } else {
                    this.registers[0xf] = 1 
                }
                this.registers[x] =  this.registers[y] - this.registers[x]
            }
            else if(toHex(this.actual_opcode & 0x000f) == 'e'){
                this.registers[0xF] = (this.registers[x] & 0x80) >> 7 ? 1 : 0
                this.registers[x] <<= 1
            }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 9000){
            if(this.registers[x] != this.registers[y]){
                this.program_counter+=2
            }
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'a000'){
            //console.log('Instruction: Sets I to the address NNN')
            this.I = getAdress(this.actual_opcode)
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'b000'){
            this.program_counter = getAdress(this.actual_opcode) + this.registers[0]
            this.jumpFlag = true
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'c000'){
            //console.log('Instruction: Sets VX to the result of a bitwise and operation on a random number (Typically: 0 to 255) and NN')
            this.registers[x] = Math.floor(Math.random() * 0xFF) & getByte(this.actual_opcode)
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'd000'){
            //console.log('Instruction: Draws a sprite at coordinate (VX, VY) that has a width of 8 pixels and a height of N pixels')
            let height = getNibble(this.actual_opcode, 0)
            //dxyn
            this.registers[0xF] = 0
            x = this.registers[x]
            y = this.registers[y]
            for (let yline = 0; yline < height; yline++)
            {
                let pixel = this.memory[this.I + yline];
                for(let xline = 0; xline < 8; xline++)  {
                    if((pixel & (0x80 >> xline)) != 0) {
                        if(this.graphics[(x + xline + ((y + yline) * 64))] == 1)
                        this.registers[0xF] = 1;                                 
                        this.graphics[x + xline + ((y + yline) * 64)] ^= 1;
                    }
                }
            }
            this.drawFlag = true
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'e000'){
            if(toHex(this.actual_opcode & 0x00ff) == '9e'){
                if(this.keyState[this.registers[x]]){
                    this.program_counter+=2
                }
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 'a1'){
                if(this.keyState[this.registers[x]] == false){
                    this.program_counter+=2
                }
            } 
        }
        else if(toHex(this.actual_opcode & 0xf000) == 'f000'){
            if(toHex(this.actual_opcode & 0x00ff) == '7'){
                this.registers[x] =  this.delay_timer
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 'a'){
                this.isRunning = false
                this.on('keyUpdated', (value) => {
                    this.registers[x] = value
                    this.isRunning = true
                    this.cpuCycle()
                })
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 15){
                this.delay_timer = this.registers[x]
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 18){
                this.sound_timer = this.registers[x]
            }
            else if(toHex(this.actual_opcode & 0x00ff) == '1e'){
                this.I += this.registers[x]
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 29){
                this.I = this.registers[x] * 5
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 33){
                this.memory[this.I]     = parseInt(this.registers[x] / 100);
                this.memory[this.I + 1] = parseInt(this.registers[x] % 100 / 10);
                this.memory[this.I + 2] = this.registers[x] % 10;
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 55){                
                for (var i = 0; i <= x; i++) {
                    this.memory[this.I + i] = this.registers[i];
                }
            }
            else if(toHex(this.actual_opcode & 0x00ff) == 65){
                for (var i = 0; i <= x; i++) {
                    this.registers[i] = this.memory[this.I + i];
                }
            }
        }

    }

    init(rom_name){
        this.reset()
        this.loadRom(rom_name)
        setInterval(() => this.cpuCycle(), delta_time('16.666666666667ms'))
    }
}

export default Chip8;