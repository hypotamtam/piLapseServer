import express, {Request, Response} from "express"
import fs from "fs"
import fsPromise from "fs/promises"
import os from "os"
import {v4 as uuidV4} from "uuid"
import path from "path"
import {Libcam} from "./src/Libcam"
import {StreamConfigKey} from "./src/LibcamConfig"
import cors from "cors"
import {body, checkSchema, ValidationChain, validationResult} from "express-validator"
import {Schema} from "express-validator/src/middlewares/schema"
import {StreamController} from "./src/StreamController"
import {TimelapseController} from "./src/TimelapseController"
import {FFMPEG} from "./src/FFMPEG"

const tmpFile = path.resolve(path.join(os.tmpdir(), uuidV4() + ".jpg"))
fs.appendFileSync(tmpFile, "")

const libcam = new Libcam({
  "width": "640",
  "height": "320",
  "exposure": "sport",
  "timelapse": "100",
  "timeout": "9999999",
  "output": tmpFile,
  "immediate": "",
})

const streamController = new StreamController(libcam)

const timelapsePath = path.join(__dirname, "timelapse")
const timelapseController = new TimelapseController(libcam, timelapsePath)

const createMissingVideo = async () => {
  const timelapseFolders = await fsPromise.readdir(timelapsePath, {withFileTypes: true})
  const videoPathsToCreate = timelapseFolders
    .filter(folder => folder.isDirectory())
    .map(folder => path.join(timelapsePath, folder.name, `${folder.name}.mp4`))
    .filter(videoFilePath => !fs.existsSync(videoFilePath))
    .map(videoFilePath => path.dirname(videoFilePath))

  for (const videoFilePath of videoPathsToCreate) {
    try {
      await FFMPEG.createVideo(videoFilePath)
      console.log(`Timelapse video created ${videoFilePath}`)
    } catch (err) {
      console.error(`Failed to create timelapse ${videoFilePath}: ${err}`)
    }
  }
}
createMissingVideo()
  .then(() => console.log(`Missing timelapse videos created`))
  .catch(reason => console.error(`Missing timelapse video failed: ${reason}`))

const validate = (validations: ValidationChain[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const errorArray = errors.array()
    res.status(400)
       .json({
         error: errorArray
           .reduce((previousValue, currentValue, index) => previousValue + currentValue.msg + (errorArray.length === index + 1 ? "" : " - "), ""),
       })
       .end()
  }
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.writeHead(200, {"content-type": "text/html;charset=utf-8"})
  res.write(fs.readFileSync("Test.html"))
  res.end()
})

app.get('/healthCheck', (req: Request, res: Response) => {
  res.status(200)
  if (libcam.isRunning) {
    res.send("Video streaming on stage ")
  } else {
    res.send("Video streaming stopped")
  }
  res.end()
})

app.get('/stream.mjpg', (req, res) => streamController.stream(req, res))
app.put("/stop", (req, res) => streamController.stop(req, res))
app.put("/start", (req, res) => streamController.start(req, res))

const streamConfigBodyValidations = checkSchema(Object.keys(StreamConfigKey)
                                                      .reduce((schema, key) => {
                                                        schema[key] = {optional: true, isString: true, in: ["body"]}
                                                        return schema
                                                      }, {} as Schema),
).concat([
  body()
    .custom((body, meta) => Object.keys(meta.req.body).every(key => Object.keys(StreamConfigKey).includes(key)))
    .withMessage('Some extra parameters are sent'),
])

app.post("/config", validate(streamConfigBodyValidations), (req, res) => streamController.updateConfig(req, res))
app.get("/config", (req, res) => streamController.getConfig(req, res))

const timelapseBodyValidations = [
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

app.put("/timelapse", validate(timelapseBodyValidations), (req, res) => timelapseController.start(req, res))

app.listen(3001, () => {
  console.log(`server started at http://localhost:3001`)
})
