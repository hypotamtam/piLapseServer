import {Libcam} from "./Libcam"
import path from "path"
import fs from "fs"
import {Request, Response} from "express"

interface TimelapseDTO {
  duration: number
  interval: number
  name: string
}

export class TimelapseController {
  private libcam: Libcam
  private readonly timelapsePath: string

  constructor(libcam: Libcam, timelapsePath: string) {
    console.log(__filename + " " + libcam)
    this.libcam = libcam
    this.timelapsePath = timelapsePath
  }

  start(req: Request, res: Response) {
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
      this.executeAsync(dirPath, timeLapse, libcamOutput, () => console.log(""))
      res.status(200)
         .end()
    } catch (err) {
      res.status(500)
         .end()
    }
  }

  private executeAsync(dirPath: string, timeLapse: TimelapseDTO, libcamOutput: string, callback:(() => void) | undefined = undefined) {
    fs.mkdirSync(dirPath, {recursive: true})
    fs.appendFileSync(path.join(dirPath, "config.json"), JSON.stringify(timeLapse, null, 2))
    let imageCount = 1
    const saveConfig = {...this.libcam.config}
    this.libcam.config = {
      ...this.libcam.config,
      "timelapse": timeLapse.interval.toString(),
      "width": undefined,
      "height": undefined
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
      if (eventType == 'change') {
        try {
          const filePath = path.join(dirPath, `${imageCount}.jpg`)
          imageCount = imageCount + 1
          const data = fs.readFileSync(filePath)
          fs.appendFile(filePath, data, err => console.error(`Error writing ${imageCount}.jpg at ${dirPath}: ${err}`))
        } catch (ex) {
          console.error(`Error writing ${imageCount}.jpg at ${dirPath}: ${ex}`)
        }
      }
    })

    this.libcam.once("stop", finishTimelapse)
  }
}