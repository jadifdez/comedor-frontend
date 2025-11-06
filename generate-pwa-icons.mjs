import sharp from 'sharp';
import { readFileSync } from 'fs';

const sizes = [192, 512];

async function generateIcons() {
  const inputBuffer = readFileSync('./public/favicon-lospinos.png');

  for (const size of sizes) {
    await sharp(inputBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(`./public/pwa-${size}x${size}.png`);

    console.log(`Generated pwa-${size}x${size}.png`);
  }

  await sharp(inputBuffer)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile('./public/apple-touch-icon.png');

  console.log('Generated apple-touch-icon.png');
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
