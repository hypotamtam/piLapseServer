import EventEmitter from "events";
import {ChildProcess, spawn} from "child_process";
import {VideoStreamConfig, VideoStreamConfigValue} from "./VideoStreamConfig";

export class VideoStream {

    private process?: ChildProcess

    private emitter = new EventEmitter()

    private readonly command: string
    private readonly parameters: string[]

    get isRunning(): boolean {
        if (this.process) {
            return this.process.exitCode == null
        }
        return false
    }

    constructor(config: VideoStreamConfig) {
        this.command = "libcamera-still"
        this.parameters = Object.keys(config)
            .map(key => {
                return {key: key, value: config[key as VideoStreamConfigValue]}
            })
            .reduce((previousValue, currentValue) => {
                if (currentValue.value) {
                    previousValue.push(currentValue.key)
                    previousValue.push(currentValue.value)
                }
                return previousValue
            }, ["--immediate"])
    }

    private run() {
        console.log("Run command " + this.command)
        this.process = spawn(this.command, this.parameters, {
            detached: true,
            stdio: 'ignore'
        })

        this.process.on("close", (code, signal) => {
            if (code == 0) {
                this.run()
            } else {
                console.error(`Command ${this.command} failed with code ${code} and signal ${signal}`)
                this.stop()
            }
        })

        this.process.on('error', error => {
            console.error(`Command ${this.command} failed ${error}`)
            this.stop()
        })
    }

    start() {
        if (this.isRunning) {
            return
        }
        this.run()
    }

    stop() {
        if (this.process) {
            this.process.kill()
        }
        this.emitter.emit('stop')
    }

    on(event:"stop", listener: () => void) {
        this.emitter.on('stop', listener)
    }
}