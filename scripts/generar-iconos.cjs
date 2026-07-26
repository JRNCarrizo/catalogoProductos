/**
 * Genera iconos PNG para Electron y Android a partir de branding/icon.svg
 * Uso: node scripts/generar-iconos.cjs
 */
const fs = require('node:fs/promises')
const path = require('node:path')

async function main() {
  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.error('Instalá sharp una vez: npm install -D sharp')
    process.exit(1)
  }

  const raiz = path.join(__dirname, '..')
  const svg = await fs.readFile(path.join(raiz, 'branding', 'icon.svg'))

  const render = (size) =>
    sharp(svg, { density: Math.max(72, size) })
      .resize(size, size, { fit: 'contain', background: { r: 14, g: 10, b: 12, alpha: 1 } })
      .png()

  // Electron / branding
  await fs.mkdir(path.join(raiz, 'admin'), { recursive: true })
  await render(512).toFile(path.join(raiz, 'admin', 'icon.png'))
  await render(256).toFile(path.join(raiz, 'branding', 'icon-256.png'))
  console.log('OK admin/icon.png')

  // Windows .ico (múltiples tamaños) para el .exe / acceso directo
  try {
    const pngToIco = require('png-to-ico')
    const toIco = pngToIco.default || pngToIco
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const buffers = []
    for (const size of sizes) {
      buffers.push(await render(size).toBuffer())
    }
    const ico = await toIco(buffers)
    await fs.writeFile(path.join(raiz, 'admin', 'icon.ico'), ico)
    console.log('OK admin/icon.ico')
  } catch (error) {
    console.warn('No pude generar icon.ico (¿falta png-to-ico?):', error.message)
  }

  // Android launcher sizes (legacy + adaptive foreground)
  const densidades = [
    { carpeta: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { carpeta: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { carpeta: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { carpeta: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { carpeta: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ]

  const res = path.join(raiz, 'colector', 'android', 'app', 'src', 'main', 'res')
  for (const d of densidades) {
    const dir = path.join(res, d.carpeta)
    await fs.mkdir(dir, { recursive: true })
    await render(d.launcher).toFile(path.join(dir, 'ic_launcher.png'))
    await render(d.launcher).toFile(path.join(dir, 'ic_launcher_round.png'))
    await render(d.foreground).toFile(path.join(dir, 'ic_launcher_foreground.png'))
    console.log(`OK ${d.carpeta}`)
  }

  // Favicon web al día (mismo logo)
  await fs.copyFile(path.join(raiz, 'branding', 'icon.svg'), path.join(raiz, 'public', 'favicon.svg'))
  console.log('OK public/favicon.svg')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
