import EventEmitter from "events";
import {ChildProcess, spawn} from "child_process";
import {LibcamConfig, LibcamConfigKey, RawLibcamConfigKey} from "./LibcamConfig";

export class Libcam {

    private process?: ChildProcess

    private emitter = new EventEmitter()

    private readonly command = "libcamera-still"
    private parameters: string[] = []
    private _config: LibcamConfig = {}

    get isRunning(): boolean {
        if (this.process) {
            return this.process.signalCode == null || this.process.exitCode == null
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
        if (this.isRunning) {
            this.stop()
            console.log("Is libcam running: " + this.isRunning)
            this.start()
        }
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
        if (this.process) {
            this.process.kill()
            this.process = undefined
        }
        this.emitter.emit('stop')
        console.log("Libcam is stopped: " + this.isRunning)
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