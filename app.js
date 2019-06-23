// dependencies
const { Bar, Presets } = require('cli-progress');
const { PassThrough } = require('stream');
const fetch = require('node-fetch');
const fs = require('fs');

// parse the terminal arguments and get the url
const arg = 2 in process.argv ? process.argv.slice(2) : false;
const urls = arg ? arg : process.exit(1);

// get the directory
const directory = process.cwd();

// gets the url and saved file name  -by default the time now-
// returns a promise that resolves on finish event of writable stream
async function downloadMedia(url, savedName = new Date().getTime().toString()) {
  const res = await fetch(url);
  const headers = res.headers;
  const fileSize = parseInt(headers.get('Content-Length'));
  const chunkSize = 256 * 1024;

  // extract the file type from content-type header
  // e.g. images/jpg -> jpg
  const fileExtension = headers.get('Content-Type')
    ? /\/(\w+)/.exec(headers.get('Content-Type'))[1]
    : false;

  return new Promise((resolve, reject) => {
    if (fileExtension) {
      // add a progress bar
      const pbar = new Bar({}, Presets.shades_classic);
      // start with a max equal the file size
      pbar.start(fileSize, 0);
      // fetch returns a passThrough stream as
      // the actual media in response body --readable and writable--
      let body = res.body;
      // fixed large chunk size
      body._readableState.highWaterMark = chunkSize;
      const fileName = `${directory}/${savedName}.${fileExtension}`;
      // writable stream to pipe body to it
      const fileDownloaded = fs.createWriteStream(fileName);
      // create a pathThrough stream to measure progress
      const updatePbar = new PassThrough();
      let progressDownload = 0;
      updatePbar.on('data', chunk => {
        // add new chunk length to the progress download variable
        progressDownload += chunk.length;
        // update the bar with new current value
        pbar.update(progressDownload);
      });
      // resolve when the file is written
      fileDownloaded.on('finish', err => {
        if (err) reject(err);
        pbar.stop();
        resolve('file downloaded 🎉');
      });
      // pipe date from body through the progress bar
      // and to the file
      body.pipe(updatePbar).pipe(fileDownloaded);
    } else {
      reject('Could not get file extension 😢');
    }
  });
}

// Iterate through given urls
for (const url of urls) {
  downloadMedia(url)
    .then(console.log)
    .catch(console.error);
}

module.exports = {
  downloadMedia
};
