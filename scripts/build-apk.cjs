/**
 * Genera la APK debug del colector usando el JDK de Android Studio.
 * Uso: npm run apk (desde colector/)
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const raiz = path.join(__dirname, '..', 'colector')
const android = path.join(raiz, 'android')
const jbr = 'C:\\Program Files\\Android\\Android Studio\\jbr'
const sdk = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')

if (!fs.existsSync(path.join(jbr, 'bin', 'java.exe'))) {
  console.error('No encontré el JDK de Android Studio en:', jbr)
  process.exit(1)
}

const localProps = path.join(android, 'local.properties')
fs.writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`)

const env = {
  ...process.env,
  JAVA_HOME: jbr,
  ANDROID_HOME: sdk,
  PATH: `${path.join(jbr, 'bin')};${process.env.PATH}`,
}

const gradlew = path.join(android, 'gradlew.bat')
const build = spawnSync(gradlew, ['assembleDebug', '--no-daemon'], {
  cwd: android,
  env,
  stdio: 'inherit',
  shell: true,
})

if (build.status !== 0) process.exit(build.status || 1)

const origen = path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
const destinoDir = path.join(raiz, 'apk')
fs.mkdirSync(destinoDir, { recursive: true })
const destino = path.join(destinoDir, 'VinosColector-debug.apk')
fs.copyFileSync(origen, destino)
console.log('\nAPK lista:', destino)
