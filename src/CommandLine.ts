import {ChildProcess, spawn} from "child_process"

export abstract class CommandLine {
  protected process?: ChildProcess

  protected abstract readonly command: string
  protected parameters: string[] = []

  get isRunning(): boolean {
    if (this.process) {
      return !this.process.killed
    }
    return false
  }

  start() {
    if (this.isRunning) {
      console.log(`${this.command} already running`)
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
    console.log(`${this.command} is stopped: ${this.isRunning}`)
  }



  private run() {
    this.process = spawn(this.command, this.parameters, {
      detached: true,
      stdio: 'ignore',
    })
    this.process.once("error", err => {
      console.error(`Process error ${err}`)
      this.close(-1, null)
    })
    this.process.once("close", (code, signal) => this.close(code, signal))
  }

  protected abstract close(code: number | null, signal: NodeJS.Signals | null): void
}