/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  const svgPath = path.resolve(__dirname, '..', 'assets', 'icon.svg');
  const outDir = path.resolve(__dirname, '..', 'build');
  if (!fs.existsSync(svgPath)) {
    console.error('assets/icon.svg not found.');
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pngPath = path.join(outDir, 'icon.png');
  console.log('Generating PNG from SVG:', svgPath);
  await sharp(svgPath)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(pngPath);
  console.log('PNG generated:', pngPath);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  console.log('Generating ICO from PNG in-memory...');
  const bufs = [];
  for (const size of sizes) {
    const b = await sharp(pngPath).resize(size, size).png().toBuffer();
    bufs.push(b);
  }
  const icoBuf = await pngToIco(bufs);
  const icoPath = path.join(outDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuf);
  console.log('ICO generated:', icoPath);

  process.exit(0);
})().catch((e) => {
  console.error('Icon generation failed:', e && e.message ? e.message : e);
  process.exit(1);
});