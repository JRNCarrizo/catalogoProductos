const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const path = require('node:path')

const raizProyecto = path.join(__dirname, '..')
const rutaCatalogo = path.join(raizProyecto, 'public', 'data', 'productos.json')
const carpetaImagenes = path.join(raizProyecto, 'public', 'img')

let ventana = null

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    backgroundColor: '#0e0a0c',
    title: 'Panel del catálogo',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  ventana.loadFile(path.join(__dirname, 'ui', 'index.html'))
}

app.whenReady().then(() => {
  crearVentana()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/** Ejecuta un comando en la raíz del proyecto y devuelve su salida combinada. */
function ejecutar(comando, argumentos) {
  return new Promise((resolver) => {
    execFile(
      comando,
      argumentos,
      { cwd: raizProyecto, shell: process.platform === 'win32', maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolver({
          ok: !error,
          salida: `${stdout ?? ''}${stderr ?? ''}`.trim(),
        })
      },
    )
  })
}

ipcMain.handle('catalogo:leer', async () => {
  const contenido = await fs.readFile(rutaCatalogo, 'utf8')
  return JSON.parse(contenido)
})

ipcMain.handle('catalogo:guardar', async (_evento, catalogo) => {
  const datos = { ...catalogo, actualizado: new Date().toISOString() }
  await fs.writeFile(rutaCatalogo, `${JSON.stringify(datos, null, 2)}\n`, 'utf8')
  return datos
})

ipcMain.handle('imagen:elegir', async (_evento, idProducto) => {
  const resultado = await dialog.showOpenDialog(ventana, {
    title: 'Elegir foto de la botella',
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] }],
    properties: ['openFile'],
  })

  if (resultado.canceled || resultado.filePaths.length === 0) return null

  const origen = resultado.filePaths[0]
  const extension = path.extname(origen).toLowerCase()
  const nombreArchivo = `${idProducto || `foto-${Date.now()}`}${extension}`

  await fs.mkdir(carpetaImagenes, { recursive: true })
  await fs.copyFile(origen, path.join(carpetaImagenes, nombreArchivo))

  return `img/${nombreArchivo}`
})

ipcMain.handle('sitio:vistaPrevia', async () => {
  await shell.openExternal('http://localhost:5173')
})

ipcMain.handle('sitio:publicar', async (_evento, mensaje) => {
  const pasos = []

  const estado = await ejecutar('git', ['status', '--porcelain'])
  if (!estado.ok) {
    return { ok: false, pasos: [{ paso: 'git status', salida: estado.salida || 'Git no está disponible.' }] }
  }
  if (!estado.salida) {
    return { ok: true, sinCambios: true, pasos: [{ paso: 'Sin cambios', salida: 'No hay nada nuevo para publicar.' }] }
  }

  const secuencia = [
    { paso: 'Preparando archivos', comando: 'git', argumentos: ['add', '-A'] },
    {
      paso: 'Guardando cambios',
      comando: 'git',
      argumentos: ['commit', '-m', mensaje || 'Actualizo el catálogo'],
    },
    { paso: 'Publicando', comando: 'git', argumentos: ['push'] },
  ]

  for (const item of secuencia) {
    const resultado = await ejecutar(item.comando, item.argumentos)
    pasos.push({ paso: item.paso, salida: resultado.salida })
    if (!resultado.ok) return { ok: false, pasos }
  }

  return { ok: true, pasos }
})
