import {CommandLine} from "./CommandLine"
import path from "path"

export class FFMPEG extends CommandLine {
  protected readonly command: string = "bash"

  private readonly listener: (err: Error | null) => void

  static async createVideo(path: string) {
    const promise = new Promise<void>((resolve, reject) => {
      try {
        const ffmpeg = new FFMPEG(path, err => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
        ffmpeg.start()
      } catch (err) {
        console.error(err)
        reject(err)
      }
    })
    await promise
  }

  private constructor(imagesPath: string, listener: (err: Error | null) => void) {
    super()
    this.listener = listener
    const scriptPath = path.join(process.cwd(), "scripts/timelapseCreator.sh")
    this.parameters = [ scriptPath, imagesPath ]
  }

  protected close(code: number | null, signal: NodeJS.Signals | null): void {
    if (code == 0 && signal == null) {
      this.listener(null)
    } else {
      this.listener(new Error(`Finish with code ${code} and signal ${signal}`))
    }
  }

}