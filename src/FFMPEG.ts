import {CommandLine} from "./CommandLine"
import path from "path"
import fs from "fs"
import {TimelapseDTO} from "./TimelapseController"

export class FFMPEG extends CommandLine {
  protected readonly command: string = "ffmpeg"

  private readonly imagesPath: string

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
    this.imagesPath = imagesPath
    this.listener = listener
    const config = this.readConfig()
    const imagePathTemplate = path.join(imagesPath, "*.jpg")
    const videoPath =  path.join(imagesPath, `${config.name}.mp4`)
    this.parameters = [
      "-r", "24", "-f", "image2" ,"-pattern_type" ,"glob" , "-i" , imagePathTemplate,
      "-s", "1920x1080",  "-vcodec" ,"libx264", videoPath
    ]
  }

  private readConfig() {
    const configFile = path.join(this.imagesPath, "config.json")
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file missing at ${this.imagesPath}`)
    }
    const configData = fs.readFileSync(configFile)
    const config: TimelapseDTO = JSON.parse(configData.toString('utf-8'))
    return config
  }



  protected close(code: number | null, signal: NodeJS.Signals | null): void {
    if (code == 0 && signal == null) {
      this.listener(null)
    } else {
      this.listener(new Error(`Finish with code ${code} and signal ${signal}`))
    }
  }

}