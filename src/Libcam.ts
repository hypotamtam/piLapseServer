import EventEmitter from "events";
import {ChildProcess, spawn} from "child_process";
import {LibcamConfig, LibcamConfigKey, RawLibcamConfigKey} from "./LibcamConfig";

export class Libcam {
    private process?: ChildProcess

    private emitter = new EventEmitter()

    private readonly command = "libcamera-still"
    private parameters: string[] = []
    private _config: LibcamConfig = {}

    private shouldRestart = false

    get isRunning(): boolean {
        if (this.process) {
            return !this.process.killed
        }
        return false
    }

    get config() {
         return this._config
    }

    set config(value: LibcamConfig) {
        console.log("Update the stream config: " + JSON.stringify(value))
        this._config = value
        this.parameters = Object.keys(value)
            .map(key => key as RawLibcamConfigKey)
            .flatMap( configValue => [LibcamConfigKey[configValue], value[configValue] as string])
        this.updateProcess()
    }

    constructor(config: LibcamConfig) {
        this.config = config
    }

    start() {
        if (this.isRunning) {
            console.log("Libcam already running")
            return
        }
        console.log("Start " + this.command + " " + this.parameters.join(" "))
        this.run()
    }

    stop() {
        if (!this.isRunning) {
            return
        }
        this.process?.kill()
        console.log("Libcam is stopped: " + this.isRunning)
    }

    once(event:"stop", listener: () => void) {
        this.emitter.on('stop', listener)
    }

    private updateProcess() {
        if (this.isRunning) {
            this.shouldRestart = true
            this.process?.kill()
        }
    }

    private run() {
        this.process = spawn(this.command, this.parameters, {
            detached: true,
            stdio: 'ignore'
        })

        this.process.once("close", (code, signal) => {
            if (code == 0 || this.shouldRestart) {
                this.shouldRestart = false
                console.log(`Command ${this.command} stopped with code ${code} and signal ${signal}`)
                this.start()
            } else {
                console.error(`Command ${this.command} failed with code ${code} and signal ${signal}`)
                this.process = undefined
                this.emitter.emit('stop')
            }
        })
    }
}