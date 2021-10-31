import {LibcamConfig, LibcamConfigKey, RawLibcamConfigKey} from "./LibcamConfig"
import {CommandLine} from "./CommandLine"
import EventEmitter from "events"

export class Libcam extends CommandLine {
  protected readonly command = "libcamera-still"

  private shouldRestart = false

  private emitter = new EventEmitter()

  private _config: LibcamConfig = {}
  lockConfig = false

  get config() {
    return this._config
  }

  set config(value: LibcamConfig) {
    if (this.lockConfig) {
      throw new Error("libcam config is locked")
    }
    console.log("Update the stream config: " + JSON.stringify(value))
    this._config = value
    this.parameters = Object.keys(value)
                            .map(key => key as RawLibcamConfigKey)
                            .filter(configValue => value[configValue])
                            .flatMap(configValue => [LibcamConfigKey[configValue], value[configValue] as string])
    this.updateProcess()
  }

  constructor(config: LibcamConfig) {
    super()
    this.config = config
  }

  private updateProcess() {
    if (this.isRunning) {
      this.shouldRestart = true
      this.stop()
    }
  }

  once(event: "stop", listener: () => void) {
    this.emitter.on('stop', listener)
  }

  protected close(code: number | null, signal: NodeJS.Signals | null) {
    if (code == 0 || this.shouldRestart) {
      this.shouldRestart = false
      console.log(`Command ${this.command} stopped with code ${code} and signal ${signal}`)
      this.start()
    } else {
      console.error(`Command ${this.command} failed with code ${code} and signal ${signal}`)
      this.process = undefined
      this.emitter.emit('stop')
    }
  }
}