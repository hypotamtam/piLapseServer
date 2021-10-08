import express, {Request, Response} from "express"
import fs from "fs"
import {VideoStreamConfigValue} from "./VideoStreamConfig";
import os from "os"
import {v4 as uuidV4} from "uuid"
import path from "path"
import {VideoStream} from "./VideoStream";

const app = express()

const tmpFile = path.resolve(path.join(os.tmpdir(), uuidV4() + ".jpg"))
fs.appendFileSync(tmpFile, "")

const videoStream = new VideoStream({
    [VideoStreamConfigValue.width]: "640",
    [VideoStreamConfigValue.height]: "320",
    [VideoStreamConfigValue.exposure]: "sport",
    [VideoStreamConfigValue.timelapse]: "50",
    [VideoStreamConfigValue.timeout]: "9999999",
    [VideoStreamConfigValue.output]: tmpFile
})


app.get('/', (req, res) => {
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" })
    res.write(fs.readFileSync("Test.html"))
    res.end()
})

app.get('/healthCheck', (req: Request, res: Response) => {
    res.status(200)
    if (videoStream.isRunning) {
        res.send("Video streaming on stage ")
    } else {
        res.send("Video streaming stopped")
    }
    res.end()
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
        .end()
})

app.listen(3000, () => {
    console.log(`server started at http://localhost:3000`)
})
