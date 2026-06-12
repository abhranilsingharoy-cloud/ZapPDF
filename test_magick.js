const { initializeImageMagick, MagickFormatInfo } = require('@imagemagick/magick-wasm');
const fs = require('fs');

async function test() {
  const wasmBytes = fs.readFileSync('node_modules/@imagemagick/magick-wasm/dist/magick.wasm');
  await initializeImageMagick(wasmBytes);
  const formats = MagickFormatInfo.all.filter(f => 
    ['RAW', 'EPS', 'CR2', 'NEF', 'PSD', 'TIFF'].includes(f.format)
  ).map(f => `${f.format}: ${f.description}`);
  console.log("Supported formats:");
  console.log(formats);
}
test().catch(console.error);
