/**
 * Empaqueta el panel para Windows e incrusta el ícono (.ico) en el .exe.
 * Uso: npm run panel:release
 *
 * Nota: signAndEditExecutable=false evita un bug de symlinks de electron-builder
 * en Windows; por eso aplicamos el ícono con rcedit después del empaquetado.
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const rceditModule = require('rcedit')
const rcedit = rceditModule.default || rceditModule.rcedit || rceditModule

const raiz = path.resolve(__dirname, '..')
const ico = path.join(raiz, 'admin', 'icon.ico')
const unpacked = path.join(raiz, 'release', 'win-unpacked')
const exe = path.join(unpacked, 'Vinos de Remate Panel.exe')

function correr(comando, args) {
  const r = spawnSync(comando, args, {
    cwd: raiz,
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
    stdio: 'inherit',
    shell: true,
  })
  if (r.status !== 0) process.exit(r.status || 1)
}

async function main() {
  if (!fs.existsSync(ico)) {
    console.log('Generando admin/icon.ico…')
    correr('node', [path.join('scripts', 'generar-iconos.cjs')])
  }
  if (!fs.existsSync(ico)) {
    console.error('Falta admin/icon.ico. Corré: npm run iconos')
    process.exit(1)
  }

  console.log('› Empaquetando (win-unpacked)…')
  correr('npx', ['electron-builder', '--win', 'dir'])

  if (!fs.existsSync(exe)) {
    console.error('No encontré el ejecutable en', exe)
    process.exit(1)
  }

  console.log('› Incrustando ícono en el .exe…')
  await rcedit(exe, {
    icon: ico,
    'version-string': {
      CompanyName: 'JRNCarrizo',
      FileDescription: 'Panel de carga · Vinos de Remate',
      ProductName: 'Vinos de Remate Panel',
      LegalCopyright: 'Copyright © JRNCarrizo',
    },
    'file-version': '1.0.0',
    'product-version': '1.0.0',
  })

  // También copiar el .ico a build resources por si NSIS lo usa
  const buildDir = path.join(raiz, 'build')
  fs.mkdirSync(buildDir, { recursive: true })
  fs.copyFileSync(ico, path.join(buildDir, 'icon.ico'))

  console.log('› Generando Portable + Setup…')
  correr('npx', ['electron-builder', '--prepackaged', `"${unpacked}"`, '--win', 'portable', 'nsis'])

  console.log('\nListo:')
  console.log('  release\\VinosPanel-Portable.exe')
  console.log('  release\\VinosPanel-Setup.exe')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
