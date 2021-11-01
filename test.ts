import {exec} from "child_process"

const ffmpeg = "ffmpeg -r 24 -f image2 -pattern_type glob -i '/root/piLapseServer/timelapse/3/*.jpg' -s 1920x1080 -vcodec libx264 /root/piLapseServer/timelapse/3/3.mp4"
exec(ffmpeg , (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
})


