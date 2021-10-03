import express, {Request, Response} from "express"
import Util from "util"
import EventEmitter from "events"
import ChildProcess from "child_process"
import {PNG} from "pngjs"
import fs from "fs"

const app = express()
const exec = Util.promisify(ChildProcess.exec);

class VideoStream extends EventEmitter {
    private isRunning: boolean = false

    private run() {
        this.getFrame()
            .finally(() => {
                if (this.isRunning) {
                    this.run()
                }
            })
    }

    private async getFrame() {
        await exec("libcamera-still -e png -o test.png")
        let fileData = fs.readFileSync('test.png')
        let png = new PNG()
        png.parse(fileData, (error, img) => {
            this.emit('newFrame', img.data)
        })
    }

    start() {
        if (this.isRunning) {
            return
        }
        this.isRunning = true
        this.run()
    }

    stop() {
        this.isRunning = true
    }
}

app.get('/test', (req: Request, res: Response) => {
    res.status(200)
        .send("youpi")
})

const videoStream = new VideoStream()

app.get('/stream.mjpg', (req: Request, res: Response) => {

    videoStream.start()
    res.writeHead(200, {
        'Cache-Control': 'no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0',
        'Pragma': 'no-cache',
        'Connection': 'close',
        'Content-Type': 'multipart/x-mixed-replace; boundary=--myboundary'
    })

    let isReady = true
    videoStream.on("newFrame", (frameData: Buffer) => {
        try {
            if (!isReady) {
                return;
            }

            isReady = false

            console.log('Writing frame: ' + frameData.length)
            res.write(`--myboundary\nContent-Type: image/jpg\nContent-length: ${frameData.length}\n\n`)
            res.write(frameData, function () {
                isReady = true;
            })
        } catch (ex) {
            console.log('Unable to send frame: ' + ex)
        }
    })
})

app.get("/stop",  (req: Request, res: Response) => {
    videoStream.stop()
    res.status(200)
        .send
})

app.listen(3000, () => {
    console.log(`server started at http://localhost:3000`)
})
