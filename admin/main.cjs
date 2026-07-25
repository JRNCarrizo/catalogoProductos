const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { crearServidorSync } = require('./sync-server.cjs')
const {
  leerPedidos,
  confirmarPedido,
  recibirPedidoPendiente,
  descartarPendiente,
  anularPedido,
} = require('./pedidos.cjs')
const QRCode = require('qrcode')

const raizProyecto = path.join(__dirname, '..')
const rutaCatalogo = path.join(raizProyecto, 'public', 'data', 'productos.json')
const rutaPedidos = path.join(__dirname, 'pedidos.json')
const carpetaImagenes = path.join(raizProyecto, 'public', 'img')

let ventana = null
let sync = null

function avisarPedidos() {
  if (ventana && !ventana.isDestroyed()) {
    void leerPedidos(rutaPedidos).then((pedidos) => {
      ventana.webContents.send('pedidos:actualizados', pedidos)
    })
  }
}

async function estadoSyncCompleto() {
  const puerto = sync?.puerto ?? 3847
  const ips = sync?.ips() ?? []
  const endpoints = []

  for (const ip of ips) {
    const url = `http://${ip}:${puerto}`
    endpoints.push({
      ip,
      puerto,
      url,
      qr: await QRCode.toDataURL(url, {
        margin: 1,
        width: 280,
        color: { dark: '#0e0a0c', light: '#f7f1e8' },
      }),
    })
  }

  return {
    activo: Boolean(sync),
    puerto,
    ips,
    endpoints,
  }
}

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

app.whenReady().then(async () => {
  sync = crearServidorSync({
    rutaCatalogo,
    rutaPedidos,
    onSync: (catalogo) => {
      if (ventana && !ventana.isDestroyed()) {
        ventana.webContents.send('catalogo:desde-celular', catalogo)
      }
    },
    onPedido: () => avisarPedidos(),
  })

  try {
    await sync.iniciar()
  } catch (error) {
    console.error('No se pudo iniciar el servidor de sync:', error)
  }

  crearVentana()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void sync?.detener()
})

/** Ejecuta un comando en la raíz del proyecto y devuelve su salida combinada. */
function ejecutar(comando, argumentos) {
  return new Promise((resolver) => {
    // shell:false evita que Windows parta el mensaje del commit en varias palabras
    // ("Actualizo el catálogo" → pathspec 'el' / 'catálogo').
    execFile(
      comando,
      argumentos,
      {
        cwd: raizProyecto,
        shell: false,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
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

ipcMain.handle('pedidos:leer', async () => leerPedidos(rutaPedidos))

ipcMain.handle('pedidos:confirmar', async (_evento, payload) => {
  const resultado = await confirmarPedido({
    rutaCatalogo,
    rutaPedidos,
    texto: payload?.texto,
    pendienteId: payload?.pendienteId,
    origen: payload?.origen || 'panel',
  })
  return resultado
})

ipcMain.handle('pedidos:descartar', async (_evento, pendienteId) => {
  return descartarPendiente(rutaPedidos, pendienteId)
})

ipcMain.handle('pedidos:anular', async (_evento, pedidoId) => {
  return anularPedido({ rutaCatalogo, rutaPedidos, pedidoId })
})

ipcMain.handle('pedidos:previsualizar', async (_evento, texto) => {
  const bruto = await fs.readFile(rutaCatalogo, 'utf8')
  const catalogo = JSON.parse(bruto)
  const { parsearPedido } = require('./pedidos.cjs')
  return parsearPedido(texto || '', catalogo.productos)
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

ipcMain.handle('sync:estado', async () => estadoSyncCompleto())

ipcMain.handle('sitio:publicar', async (_evento, mensaje) => {
  const pasos = []

  const estado = await ejecutar('git', ['status', '--porcelain'])
  if (!estado.ok) {
    return { ok: false, pasos: [{ paso: 'git status', salida: estado.salida || 'Git no está disponible.' }] }
  }
  if (!estado.salida) {
    return { ok: true, sinCambios: true, pasos: [{ paso: 'Sin cambios', salida: 'No hay nada nuevo para publicar.' }] }
  }

  // En Windows el -m "texto con espacios" se parte mal; -F con archivo evita eso.
  const textoCommit = String(mensaje || 'Actualizo el catalogo').trim() || 'Actualizo el catalogo'
  const archivoMensaje = path.join(os.tmpdir(), `vinos-commit-${Date.now()}.txt`)
  await fs.writeFile(archivoMensaje, `${textoCommit}\n`, 'utf8')

  try {
    const secuencia = [
      { paso: 'Preparando archivos', comando: 'git', argumentos: ['add', '-A'] },
      {
        paso: 'Guardando cambios',
        comando: 'git',
        argumentos: ['commit', '-F', archivoMensaje],
      },
      { paso: 'Publicando', comando: 'git', argumentos: ['push'] },
    ]

    for (const item of secuencia) {
      const resultado = await ejecutar(item.comando, item.argumentos)
      pasos.push({ paso: item.paso, salida: resultado.salida })
      if (!resultado.ok) return { ok: false, pasos }
    }

    return { ok: true, pasos }
  } finally {
    await fs.unlink(archivoMensaje).catch(() => undefined)
  }
})
