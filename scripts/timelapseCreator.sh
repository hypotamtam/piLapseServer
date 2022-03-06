#!/bin/bash

if [ ! $# -eq 1 ]
  then
    echo "Need 2 arguments"
    exit 1
fi

if [ -z "$1" ] 
then
    echo "Arguments shoud not be empty"
    exit 1
fi

dirName=$(basename $1)
mp4File="${1}/${dirName}.mp4" 
jpgFiles="${1}/*.jpg"

if [ -f "$mp4File" ]; then
    echo "$mp4File exists."
    exit 1
fi

echo "JPEG files $jpgFiles"
echo "mp4 file $mp4File"

ffmpeg -r 24 -f image2 -pattern_type glob -i "$jpgFiles" -s 1920x1080 -vcodec libx264 "$mp4File"