const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VIDEO_DIR = 'src/assets/video';
const THUMBNAIL_DIR = 'src/assets/video/thumbnails';

// Create thumbnails directory if it doesn't exist
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  console.log(`Created directory: ${THUMBNAIL_DIR}`);
}

// Get all MP4 files in video directory
const videoFiles = fs.readdirSync(VIDEO_DIR).filter(file => file.endsWith('.mp4'));

if (videoFiles.length === 0) {
  console.log('No MP4 files found in video directory.');
  process.exit(0);
}

console.log(`Found ${videoFiles.length} video files to process.\n`);

// Process each video
videoFiles.forEach((filename, index) => {
  console.log(`[${index + 1}/${videoFiles.length}] Processing: ${filename}`);
  
  const videoPath = path.join(VIDEO_DIR, filename);
  const baseName = path.basename(filename, '.mp4');
  
  try {
    // Get video duration using ffprobe
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const duration = parseFloat(execSync(durationCmd, { encoding: 'utf-8' }).trim());
    
    if (isNaN(duration)) {
      console.log(`  ⚠ Could not get duration for ${filename}, skipping.\n`);
      return;
    }
    
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    
    // Calculate timestamps for 25%, 50%, 75%
    const timestamps = [
      duration * 0.25,
      duration * 0.50,
      duration * 0.75
    ];
    
    // Extract thumbnails at each timestamp
    timestamps.forEach((timestamp, thumbIndex) => {
      const thumbFilename = `${baseName}_${thumbIndex + 1}.jpg`;
      const thumbPath = path.join(THUMBNAIL_DIR, thumbFilename);
      
      const ffmpegCmd = `ffmpeg -ss ${timestamp.toFixed(2)} -i "${videoPath}" -vframes 1 -q:v 2 "${thumbPath}" -y`;
      
      try {
        execSync(ffmpegCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
        console.log(`  ✓ Generated: ${thumbFilename} (${(timestamp.toFixed(2))}s)`);
      } catch (error) {
        console.log(`  ✗ Failed to generate ${thumbFilename}`);
      }
    });
    
    console.log('');
  } catch (error) {
    console.log(`  ✗ Error processing ${filename}: ${error.message}\n`);
  }
});

console.log('Thumbnail generation complete!');
console.log(`Thumbnails saved to: ${THUMBNAIL_DIR}`);