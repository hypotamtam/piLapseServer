import express, {Request, Response} from "express"
import Util from "util"
import EventEmitter from "events"
import ChildProcess from "child_process"
import fs from "fs"
import {VideoStreamConfig, VideoStreamConfigValue} from "./VideoStreamConfig";
import os from "os"
import {v4 as uuidV4} from "uuid"
import path from "path"


const app = express()
const exec = Util.promisify(ChildProcess.exec);

class VideoStream extends EventEmitter {
    private isRunning: boolean = false

    private readonly config: VideoStreamConfig

    private readonly command: string

    constructor(config: VideoStreamConfig) {
        super();
        this.config = config

        this.command = Object.keys(config)
            .map((key) => {
                return key + " " + config[key as VideoStreamConfigValue]
            })
            .reduce((previousValue, currentValue) => {
                return previousValue + " " + currentValue
            }, "libcamera-still --immediate")
    }

    private run() {
        this.takePicture()
            .finally(() => {
                if (this.isRunning) {
                    this.run()
                }
            })
    }

    private async takePicture() {
        try {
            await exec(this.command)
        } catch (error) {
            console.error(`Command ${this.command} failed ${error}`)
            this.stop()
        }
    }

    start() {
        if (this.isRunning) {
            return
        }
        this.isRunning = true
        this.run()
    }

    stop() {
        this.isRunning = false
        this.emit('stop')
    }
}


app.get('/test', (req: Request, res: Response) => {
    res.status(200)
        .send("youpi")
})

const tmpFile = path.resolve(path.join(os.tmpdir(), uuidV4() + ".jpg"))
fs.appendFileSync(tmpFile, "")

const videoStream = new VideoStream({
    [VideoStreamConfigValue.width]: "640",
    [VideoStreamConfigValue.height]: "320",
    [VideoStreamConfigValue.exposure]: "sport",
    [VideoStreamConfigValue.output]: tmpFile
})

app.get('/stream.mjpg', (req: Request, res: Response) => {

    videoStream.start()
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace;boundary="BOUNDARY-ID"',
        'Connection': 'keep-alive',
        'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
    });

    let isReady = true
    const fileWatcher = fs.watch(tmpFile, {persistent: true}, (eventType) => {
        if (eventType == 'change') {
            try {
                let data = fs.readFileSync(tmpFile)
                if (!isReady) {
                    console.log('Skip frame: ' + data.length)
                    return;
                }
                isReady = false

                console.log('Writing frame: ' + data.length)
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
    })

    videoStream.on("stop", () => {
        fileWatcher.close()
        res.end()
    })
})

app.get("/stop", (req: Request, res: Response) => {
    videoStream.stop()
    res.status(200)
        .send("stream finished")
})

app.listen(3000, () => {
    console.log(`server started at http://localhost:3000`)
})
