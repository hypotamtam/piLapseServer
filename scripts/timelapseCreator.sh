#!/bin/bash

if [ ! $# -eq 1 ] then
    echo "Need 2 arguments"
    exit 1
fi

if [ -z "$1" ] then
    echo "Arguments shoud not be empty"
    exit 1
fi

configFilePath="${1}/config.json"
if [ ! -f "$configFilePath" ] then
    echo "$configFilePath does not exists."
    exit 1
fi

mp4Name=$(grep -o '"name": "[^"]*' $configFilePath | grep -o '[^"]*$')
if [ -z "$mp4Name" ] then
    echo "$mp4Name shoud not be empty"
    exit 1
fi

mp4File="${1}/${mp4Name}.mp4" 
jpgFiles="${1}/*.jpg"

if [ -f "$mp4File" ] then
    echo "$mp4File already exists."
    exit 1
fi

echo "JPEG files $jpgFiles"
echo "mp4 file $mp4File"

ffmpeg -r 24 -f image2 -pattern_type glob -i "$jpgFiles" -s 1920x1080 -vcodec libx264 "$mp4File"