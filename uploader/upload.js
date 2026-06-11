const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary with the user's credentials
cloudinary.config({
  cloud_name: 'dmanesip5',
  api_key: '268943238132834',
  api_secret: 'obNm5IKU8tWw235DLP8PLErTf94',
});

// Use the local video file path
const videoFilePath = process.argv[2];

if (!videoFilePath) {
  console.error('Please provide the path to the video file as an argument.');
  console.error('Example: node upload.js "C:\\path\\to\\video.mp4"');
  process.exit(1);
}

if (!fs.existsSync(videoFilePath)) {
  console.error(`File not found: ${videoFilePath}`);
  process.exit(1);
}

console.log('Uploading large video to Cloudinary... (This may take a few minutes)');

// Since it is 140MB, we use upload_large for chunked uploading
cloudinary.uploader.upload_large(
  videoFilePath,
  {
    resource_type: 'video',
    folder: 'motionrank-assets', // Optional: organized in a folder
  },
  function (error, result) {
    if (error) {
      console.error('Error uploading to Cloudinary:', error);
      return;
    }
    console.log('\n✅ Upload Successful!');
    console.log('----------------------------------------------------');
    console.log('Your secure video URL is:');
    console.log(result.secure_url);
    console.log('----------------------------------------------------');
    console.log('Copy the URL above and put it in your frontend/.env file like this:');
    console.log(`VITE_HERO_VIDEO_URL=${result.secure_url}`);
  }
);
