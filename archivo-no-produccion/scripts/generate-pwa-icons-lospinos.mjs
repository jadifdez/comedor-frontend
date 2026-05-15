import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';

const sizes = [32, 180, 192, 512];

async function generateIcons() {
  let inputFile = './public/Sin título-1.png';

  if (!existsSync(inputFile)) {
    console.error('Error: El archivo del logo no existe:', inputFile);
    console.log('Por favor, asegúrate de que el logo "Sin título-1.png" esté en la carpeta public/');
    process.exit(1);
  }

  try {
    const inputBuffer = readFileSync(inputFile);
    const metadata = await sharp(inputBuffer).metadata();

    console.log(`Logo detectado: ${metadata.width}x${metadata.height} píxeles, formato: ${metadata.format}`);

    // Generar favicon (32x32)
    await sharp(inputBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile('./public/favicon-lospinos.png');
    console.log('✓ Generated favicon-lospinos.png (32x32)');

    // Generar apple-touch-icon (180x180)
    await sharp(inputBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile('./public/apple-touch-icon.png');
    console.log('✓ Generated apple-touch-icon.png (180x180)');

    // Generar iconos PWA (192x192 y 512x512)
    for (const size of [192, 512]) {
      await sharp(inputBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(`./public/pwa-${size}x${size}.png`);
      console.log(`✓ Generated pwa-${size}x${size}.png`);
    }

    console.log('\n✅ Todos los iconos PWA generados correctamente!');
    console.log('Iconos creados:');
    console.log('  - favicon-lospinos.png (32x32)');
    console.log('  - apple-touch-icon.png (180x180)');
    console.log('  - pwa-192x192.png');
    console.log('  - pwa-512x512.png');
  } catch (error) {
    console.error('❌ Error al generar los iconos:', error.message);
    process.exit(1);
  }
}

generateIcons().catch(console.error);
