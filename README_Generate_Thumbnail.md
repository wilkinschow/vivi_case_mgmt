# Video Thumbnail Generation

This script generates thumbnails for all MP4 videos in the `src/assets/video/` folder.

## Usage

Generate thumbnails for all videos:
```bash
node generate-thumbnails.js
```

## What It Does

1. Scans `src/assets/video/` for all `.mp4` files
2. Gets video duration using `ffprobe`
3. Extracts 3 frames at 25%, 50%, and 75% of video duration
4. Saves thumbnails as JPEGs in `src/assets/video/thumbnails/`

## Thumbnail Naming

For a video named `filename.mp4`, it generates:
- `filename_1.jpg` - Frame at 25% of video duration
- `filename_2.jpg` - Frame at 50% of video duration
- `filename_3.jpg` - Frame at 75% of video duration

## Requirements

- Node.js (installed with project)
- `ffmpeg` and `ffprobe` must be installed and available in PATH

## When to Run

Run this script whenever you add new MP4 videos to the `src/assets/video/` folder.

## Angular Integration

The Angular app automatically loads these pre-generated thumbnails when viewing a local video:
- Thumbnails are displayed below the video player
- Clicking a thumbnail seeks the video to that position
- No client-side generation needed - instant loading