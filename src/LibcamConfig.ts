
export enum LibcamConfigValue {
    width = "--width",
    height = "--height",
    timeout = "-t",
    output = "-o",
    hflip = "--hflip",
    vflip = "--vflip",
    rotation = "--rotation",
    roi = "--roi",
    shutter = "--shutter",
    analoggain = "--analoggain",
    gain = "--gain",
    metering = "--metering",
    exposure = "--exposure",
    ev = "--ev",
    awb = "--awb",
    awbgains = "--awbgains",
    flush = "--flush",
    wrap = "--wrap",
    brightness = "--brightness",
    contrast = "--contrast",
    saturation = "--saturation",
    sharpness = "--sharpness",
    framerate = "--framerate",
    denoise = "--denoise",
    viewfinderWidth = "--viewfinder-width",
    viewfinderHeight = "--viewfinder-height",
    loresWidth = "--lores-width",
    loresHeight = "--lores-height",
    quality = "-q",
    exif = "-x",
    timelapse = "--timelapse",
    framestart = "--framestart",
    datetime = "--datetime",
    timestamp = "--timestamp",
    restart = "--restart",
    thumb = "--thumb",
    encoding = "-e",
    raw = "-r",
    immediate = "--immediate"
}

export type RawLibcamConfigValue = keyof typeof LibcamConfigValue
export type LibcamConfig = Partial<Record<RawLibcamConfigValue, string>>



