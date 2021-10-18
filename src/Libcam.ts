import EventEmitter from "events";
import {ChildProcess, spawn} from "child_process";
import {LibcamConfig, LibcamConfigValue, RawLibcamConfigValue} from "./LibcamConfig";

export class Libcam {

    private process?: ChildProcess

    private emitter = new EventEmitter()

    private readonly command = "libcamera-still"
    private parameters: string[] = []

    get isRunning(): boolean {
        if (this.process) {
            return this.process.signalCode == null || this.process.exitCode == null
        }
        return false
    }

    set config(value: LibcamConfig) {
        this.parameters = Object.keys(value)
            .map(key => key as RawLibcamConfigValue)
            .flatMap( configValue => [LibcamConfigValue[configValue], value[configValue] as string])
        if (this.isRunning) {
            this.stop()
            this.start()
        }
    }

    constructor(config: LibcamConfig) {
        this.config = config
    }

    start() {
        if (this.isRunning) {
            return
        }
        console.log("Start " + this.command + " " + this.parameters.join(" "))
        this.run()
    }

    stop() {
        if (!this.isRunning) {
            return
        }
        if (this.process) {
            this.process.kill()
            this.process = undefined
        }
        this.emitter.emit('stop')
    }

    once(event:"stop", listener: () => void) {
        this.emitter.on('stop', listener)
    }

    private run() {
        this.process = spawn(this.command, this.parameters, {
            detached: true,
            stdio: 'ignore'
        })

        this.process.once("close", (code, signal) => {
            if (code == 0) {
                this.run()
            } else {
                console.error(`Command ${this.command} failed with code ${code} and signal ${signal}`)
                this.stop()
            }
        })

        this.process.once('error', error => {
            console.error(`Command ${this.command} failed ${error}`)
            this.stop()
        })
    }
}