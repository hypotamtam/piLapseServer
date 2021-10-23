export enum LibcamConfigKey {
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

export enum StreamConfigKey {
    hflip = "horizontal flip",
    vflip = "vertical flip",
    rotation = "Image rotation",
    shutter = "Set a fixed shutter speed",
    gain = "Set a fixed gain value",
    metering = "Set the metering mode (centre, spot, average, custom)",
    exposure = "Set the exposure mode (normal, sport)",
    ev = "Set the EV exposure compensation, where 0 = no change",
    awb = "Set the AWB mode (auto, incandescent, tungsten, fluorescent, indoor, daylight, cloudy, custom)",
    awbgains = "Set explict red and blue gains (disable the automatic AWB algorithm)",
    brightness = "Adjust the brightness of the output images, in the range -1.0 to 1.0",
    contrast = "Adjust the contrast of the output image, where 1.0 = normal contrast",
    saturation = "Adjust the colour saturation of the output, where 1.0 = normal and 0.0 = greyscale",
    sharpness = "Adjust the sharpness of the output image, where 1.0 = normal sharpening",
    denoise = "Sets the Denoise operating mode: auto, off, cdn_off, cdn_fast, cdn_hq",
    timelapse = "Time interval (in ms) between timelapse captures",
}

export type RawLibcamConfigKey = keyof typeof LibcamConfigKey
export type LibcamConfig = Partial<Record<RawLibcamConfigKey, string>>
export type RawStreamConfigKey = keyof typeof StreamConfigKey
export type StreamConfig = Pick<LibcamConfig, RawStreamConfigKey>

function isStreamConfigKey(value: string): value is RawStreamConfigKey {
    return Object.keys(StreamConfigKey).includes(value)
}

export function convertToStreamConfig(config: LibcamConfig) {
    return Object.keys(config)
                 .reduce((convertedConfig, key) => {
                     if (isStreamConfigKey(key)) {
                         convertedConfig[key] = config[key]
                     }
                     return convertedConfig
                 }, {} as StreamConfig)
}

export function mergeConfig(libcamConfig: LibcamConfig, streamConfig: StreamConfig) {
    const sanitizedStreamConfig = Object.keys(streamConfig)
                                        .reduce((convertedConfig, key) => {
                                            if (isStreamConfigKey(key)) {
                                                convertedConfig[key] = streamConfig[key]
                                            }
                                            return convertedConfig
                                        }, {} as StreamConfig)
    return { ...libcamConfig, ...sanitizedStreamConfig } as LibcamConfig
}

