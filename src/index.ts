import express, {Request, Response} from "express"
import fs from "fs"
import os from "os"
import {v4 as uuidV4} from "uuid"
import path from "path"
import {Libcam} from "./Libcam";
import {LibcamConfig} from "./LibcamConfig";
import cors from "cors"

const app = express()

const tmpFile = path.resolve(path.join(os.tmpdir(), uuidV4() + ".jpg"))
fs.appendFileSync(tmpFile, "")

const libcam = new Libcam({
    "width": "640",
    "height": "320",
    "exposure": "sport",
    "timelapse": "100",
    "timeout": "9999999",
    "output": tmpFile,
    "immediate": ""
})

app.use(cors)

app.get('/', (req, res) => {
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" })
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

app.get('/stream.mjpg', (req: Request, res: Response) => {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace;boundary="BOUNDARY-ID"',
        'Connection': 'keep-alive',
        'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
    });

    let isReady = true

    function writeImage() {
        try {
            let data = fs.readFileSync(tmpFile)
            if (!isReady) {
                console.log('Skip frame: ' + data.length)
                return;
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

    if (fs.existsSync(tmpFile)) {
        writeImage()
    }

    const fileWatcher = fs.watch(tmpFile, {persistent: true}, (eventType) => {
        if (eventType == 'change') {
            writeImage()
        }
    })

    libcam.once("stop", () => {
        fileWatcher.close()
        res.end()
    })
})

app.put("/stop", (req: Request, res: Response) => {
    libcam.stop()
    res.status(200)
        .send("stream finished")
        .end()
})

app.post("/config", (req: Request<{}, {}, LibcamConfig>, res) => {
    libcam.config = req.body
    res.status(200)
        .end()
})

app.put("/start", (req: Request, res: Response) => {
    libcam.start()
    res.status(200)
        .send("stream started")
        .end()
})

app.listen(3000, () => {
    console.log(`server started at http://localhost:3000`)
})
