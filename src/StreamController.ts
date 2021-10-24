import {Libcam} from "./Libcam"
import {Request, Response} from "express"
import {convertToStreamConfig, mergeConfig} from "./LibcamConfig"
import fs from "fs"

export class StreamController {
  private readonly libcam: Libcam

  constructor(libcam: Libcam) {
    this.libcam = libcam
  }

  start(req: Request, res: Response) {
    this.libcam.start()
    res.status(200)
       .json("stream started")
       .end()
  }

  stop(req: Request, res: Response) {
    this.libcam.stop()
    res.status(200)
       .send("stream finished")
       .end()
  }

  getConfig(req: Request, res: Response) {
    res.status(200)
       .json(convertToStreamConfig(this.libcam.config))
       .end()
  }

  updateConfig(req: Request, res: Response) {
    try {
      this.libcam.config = mergeConfig(this.libcam.config, req.body)
      res.status(200)
         .end()
    } catch (ex) {
      res.status(409 )
         .json({error: "A timelapse is running. You can't change the config until it's finished."})
         .end()
    }

  }

  stream(req: Request, res: Response) {
    if (this.libcam.config.output == undefined) {
      res.status(500)
        .end()
      return
    }
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace;boundary="BOUNDARY-ID"',
      'Connection': 'keep-alive',
      'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
    })

    let isReady = true
    const filePath = this.libcam.config.output

    const writeImage = () => {
      try {
        const data = fs.readFileSync(filePath)
        if (!isReady) {
          console.log('Skip frame: ' + data.length)
          return
        }
        isReady = false

        res.write('--BOUNDARY-ID\r\n')
        res.write('Content-Type: image/jpeg\r\n')
        res.write('Content-Length: ' + data.length + '\r\n')
        res.write("\r\n")
        res.write(data, 'binary')
        res.write("\r\n", () => {
          isReady = true
        })
      } catch (ex) {
        console.log('Unable to send frame: ' + ex)
      }
    }

    if (fs.existsSync(filePath)) {
      writeImage()
    }

    const fileWatcher = fs.watch(filePath, {persistent: true}, (eventType) => {
      if (eventType == 'change') {
        writeImage()
      }
    })

    this.libcam.once("stop", () => {
      fileWatcher.close()
      res.end()
    })
  }
}