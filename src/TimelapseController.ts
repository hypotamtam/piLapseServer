import {Libcam} from "./Libcam"
import path from "path"
import fs from "fs"
import {Request, Response} from "express"
import { FFMPEG } from "./FFMPEG"
import { Controller } from "./Controller"
import { ValidationChain, body } from "express-validator"
import { readdir } from 'node:fs/promises';


export interface TimelapseDTO {
  duration: number
  interval: number
  name: string
}

export class TimelapseController implements Controller {
  
  private libcam: Libcam
  private readonly timelapsePath: string

  readonly validationChain: ValidationChain[] = [
      body("duration")
        .isInt()
        .not().isString()
        .withMessage("duration must be a number"),
      body("interval")
        .isInt()
        .not().isString()
        .withMessage("interval must be a number"),
      body("name")
        .isString()
        .withMessage("name must be a string"),
      body()
        .custom((body, meta) => Object.keys(meta.req.body).every(key => ["duration", "interval", "name"].includes(key)))
        .withMessage('Some extra parameters are sent'),
  ]

  constructor(libcam: Libcam, timelapsePath: string) {
    this.libcam = libcam
    this.timelapsePath = timelapsePath
  }

  start(req: Request, res: Response): void {
    if (this.libcam.config.output == undefined) {
      res.status(500)
         .end()
      return
    }
    const libcamOutput = this.libcam.config.output
    const timeLapse: TimelapseDTO = req.body

    const dirPath = path.join(this.timelapsePath, timeLapse.name)
    if (fs.existsSync(dirPath)) {
      res.status(409)
         .json({error: "Timelapse " + timeLapse.name + " already exist"})
         .end()
      return
    }

    try {
      this.executeAsync(dirPath, timeLapse, libcamOutput, () => FFMPEG.createVideo(dirPath))
      res.status(200)
         .end()
    } catch (err) {
      res.status(500)
         .end()
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const timeLapseDirs = await readdir(this.timelapsePath)
    const timeLapseDirContents = await Promise.all(timeLapseDirs.map(async (dir) => readdir(dir) ))
    const timelapseFile = timeLapseDirContents
      .reduce((accumulator, value) => accumulator.concat(value), [])
      .filter((file) => file.endsWith(".mp4"))
      .map((mp4File) => mp4File.substring(0, mp4File.length - 4))
    
    res.status(200)
      .json( { timelapses: timelapseFile })
      .end()
  }

  private executeAsync(dirPath: string, timeLapse: TimelapseDTO, libcamOutput: string, callback: (() => void) | undefined = undefined) {
    fs.mkdirSync(dirPath, {recursive: true})
    fs.appendFileSync(path.join(dirPath, "config.json"), JSON.stringify(timeLapse, null, 2))
    let imageCount = 1
    const saveConfig = {...this.libcam.config}
    this.libcam.config = {
      ...this.libcam.config,
      "timelapse": timeLapse.interval.toString(),
      "width": undefined,
      "height": undefined,
    }

    this.libcam.lockConfig = true
    const finishTimelapse = () => {
      this.libcam.lockConfig = false
      this.libcam.config = saveConfig
      fileWatcher.close()
      clearTimeout(timeoutId)
      if (callback) {
        callback()
      }
      console.log(`Timelapse ${timeLapse.name} is finished`)
    }

    const timeoutId = setTimeout(finishTimelapse, timeLapse.duration)

    const fileWatcher = fs.watch(libcamOutput, {persistent: true}, (eventType) => {
      console.log(`fileWatcher event: ${eventType})`)
      if (eventType == 'change') {
        try {
          const filePath = path.join(dirPath, `${imageCount}.jpg`)
          const data = fs.readFileSync(libcamOutput)
          fs.appendFile(filePath, data, err => console.error(`Error while ${imageCount}.jpg is written at ${dirPath}: ${err}`))
          console.log(`${imageCount} wrote)`)
          imageCount = imageCount + 1
        } catch (ex) {
          console.error(`Error writing ${imageCount}.jpg at ${dirPath}: ${ex}`)
        }
      }
    })

    this.libcam.once("stop", finishTimelapse)
  }


}