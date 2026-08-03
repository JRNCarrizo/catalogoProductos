const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const fsSync = require('node:fs')
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
const { sugerirDatosProducto, leerClaveGemini, configurarRutaGemini } = require('./sugerencias.cjs')
const { crearServidorUi } = require('./ui-server.cjs')
const { exportarCatalogoPdf } = require('./catalogo-pdf.cjs')
const QRCode = require('qrcode')

let raizProyecto = path.join(__dirname, '..')
let rutaCatalogo = path.join(raizProyecto, 'public', 'data', 'productos.json')
let rutaPedidos = path.join(raizProyecto, 'admin', 'pedidos.json')
let carpetaImagenes = path.join(raizProyecto, 'public', 'img')

let ventana = null
let sync = null
let uiHttp = null
let urlUi = null

function aplicarRaiz(raiz) {
  raizProyecto = raiz
  rutaCatalogo = path.join(raizProyecto, 'public', 'data', 'productos.json')
  rutaPedidos = path.join(raizProyecto, 'admin', 'pedidos.json')
  carpetaImagenes = path.join(raizProyecto, 'public', 'img')
  configurarRutaGemini(path.join(raizProyecto, 'admin'))
}

function tieneCatalogo(raiz) {
  return fsSync.existsSync(path.join(raiz, 'public', 'data', 'productos.json'))
}

/** Si eligieron public/ o public/data/, sube hasta la raíz del proyecto. */
function normalizarRaizCandidata(entrada) {
  let dir = path.resolve(entrada)
  for (let i = 0; i < 4; i += 1) {
    if (tieneCatalogo(dir)) return dir
    const padre = path.dirname(dir)
    if (padre === dir) break
    dir = padre
  }
  return null
}

function rutasConfigPanel() {
  const lista = []
  try {
    lista.push(path.join(app.getPath('userData'), 'panel-config.json'))
  } catch {
    // app aún no listo
  }
  if (app.isPackaged) {
    lista.push(path.join(path.dirname(process.execPath), 'panel-config.json'))
  }
  return lista
}

async function guardarConfigPanel(raiz) {
  const datos = `${JSON.stringify({ raiz }, null, 2)}\n`
  for (const archivo of rutasConfigPanel()) {
    try {
      await fs.mkdir(path.dirname(archivo), { recursive: true })
      await fs.writeFile(archivo, datos, 'utf8')
    } catch {
      // Program Files u otra carpeta sin permiso: seguimos con las demás
    }
  }
}

async function leerRaizGuardada() {
  for (const archivo of rutasConfigPanel()) {
    try {
      const cfg = JSON.parse(await fs.readFile(archivo, 'utf8'))
      const raiz = String(cfg.raiz || '').trim()
      const ok = raiz ? normalizarRaizCandidata(raiz) : null
      if (ok) return ok
    } catch {
      // siguiente
    }
  }
  return null
}

function candidatosHabituales() {
  const home = os.homedir()
  return [
    path.join(home, 'Desktop', 'ProyectosActivos', 'catalogoProducto'),
    path.join(home, 'Escritorio', 'ProyectosActivos', 'catalogoProducto'),
    path.join(home, 'OneDrive', 'Desktop', 'ProyectosActivos', 'catalogoProducto'),
    path.join(home, 'Documents', 'ProyectosActivos', 'catalogoProducto'),
    path.join(home, 'Documentos', 'ProyectosActivos', 'catalogoProducto'),
  ]
}

async function pedirCarpetaProyecto() {
  for (let intento = 0; intento < 3; intento += 1) {
    const elegido = await dialog.showOpenDialog({
      title: 'Elegí la carpeta del proyecto',
      message:
        'Seleccioná la carpeta "catalogoProducto" (la que contiene las carpetas public y admin). No elijas public ni data.',
      properties: ['openDirectory'],
      defaultPath: path.join(os.homedir(), 'Desktop', 'ProyectosActivos'),
    })

    if (elegido.canceled || !elegido.filePaths[0]) {
      throw new Error('No se eligió la carpeta del proyecto.')
    }

    const raiz = normalizarRaizCandidata(elegido.filePaths[0])
    if (raiz) {
      await guardarConfigPanel(raiz)
      return raiz
    }

    const reintentar = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Elegir otra carpeta', 'Cancelar'],
      defaultId: 0,
      cancelId: 1,
      title: 'Carpeta incorrecta',
      message: 'No encontré public\\data\\productos.json ahí.',
      detail:
        `Elegiste:\n${elegido.filePaths[0]}\n\n` +
        'Tenés que elegir la carpeta catalogoProducto, por ejemplo:\n' +
        'Desktop\\ProyectosActivos\\catalogoProducto',
    })
    if (reintentar.response !== 0) {
      throw new Error('No se eligió la carpeta correcta del proyecto.')
    }
  }
  throw new Error('No se pudo ubicar public\\data\\productos.json')
}

async function resolverRaizProyecto() {
  if (!app.isPackaged) {
    return path.join(__dirname, '..')
  }

  if (process.env.VINOS_RAIZ) {
    const desdeEnv = normalizarRaizCandidata(process.env.VINOS_RAIZ)
    if (desdeEnv) return desdeEnv
  }

  const guardada = await leerRaizGuardada()
  if (guardada) return guardada

  // Si el .exe está dentro del repo (p. ej. release/), subimos carpetas.
  let dir = path.dirname(process.execPath)
  for (let i = 0; i < 6; i += 1) {
    const encontrada = normalizarRaizCandidata(dir)
    if (encontrada) {
      await guardarConfigPanel(encontrada)
      return encontrada
    }
    const padre = path.dirname(dir)
    if (padre === dir) break
    dir = padre
  }

  for (const candidato of candidatosHabituales()) {
    if (tieneCatalogo(candidato)) {
      await guardarConfigPanel(candidato)
      return path.resolve(candidato)
    }
  }

  return pedirCarpetaProyecto()
}

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
  const iconoVentana = fsSync.existsSync(path.join(__dirname, 'icon.ico'))
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png')

  ventana = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    backgroundColor: '#0e0a0c',
    title: 'Panel del catálogo',
    icon: iconoVentana,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // HTTP local: WASM/ONNX falla con file:// (blob:file imports).
  const destino = urlUi || path.join(__dirname, 'ui', 'index.html')
  if (urlUi) ventana.loadURL(urlUi)
  else ventana.loadFile(destino)
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vinosderemate.panel')
  }

  try {
    aplicarRaiz(await resolverRaizProyecto())
  } catch (error) {
    dialog.showErrorBox(
      'Panel del catálogo',
      error instanceof Error ? error.message : 'No se pudo ubicar el proyecto.',
    )
    app.quit()
    return
  }

  sync = crearServidorSync({
    rutaCatalogo,
    rutaPedidos,
    onSync: (catalogo) => {
      if (ventana && !ventana.isDestroyed()) {
        ventana.webContents.send('catalogo:desde-celular', catalogo)
      }
    },
    onPedido: () => avisarPedidos(),
    onSugerir: (entrada) => sugerirDatosProducto(entrada),
  })

  try {
    await sync.iniciar()
  } catch (error) {
    console.error('No se pudo iniciar el servidor de sync:', error)
  }

  try {
    uiHttp = crearServidorUi(path.join(__dirname, 'ui'))
    const info = await uiHttp.iniciar()
    urlUi = info.url
  } catch (error) {
    console.error('No se pudo iniciar el servidor de la UI:', error)
    urlUi = null
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
  void uiHttp?.detener()
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

ipcMain.handle('sugerencias:producto', async (_evento, entrada) => {
  try {
    return await sugerirDatosProducto(entrada || {})
  } catch (error) {
    return {
      ok: false,
      fuentes: [],
      sugerencia: {},
      aviso: '',
      error: error instanceof Error ? error.message : 'No se pudo sugerir',
    }
  }
})

ipcMain.handle('sugerencias:estado', async () => {
  const clave = await leerClaveGemini()
  return { geminiConfigurado: Boolean(clave) }
})

/** Borra una imagen de public/img si es segura y no es el archivo que se quiere conservar. */
async function borrarImagenLocal(rutaRelativa, exceptoAbsoluta = '') {
  const vieja = String(rutaRelativa || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!vieja.startsWith('img/') || vieja.includes('..')) return false

  const absoluta = path.resolve(path.join(raizProyecto, 'public', ...vieja.split('/')))
  if (exceptoAbsoluta && absoluta === path.resolve(exceptoAbsoluta)) return false

  const relativaAImg = path.relative(path.resolve(carpetaImagenes), absoluta)
  if (!relativaAImg || relativaAImg.startsWith('..') || path.isAbsolute(relativaAImg)) return false

  try {
    await fs.unlink(absoluta)
    return true
  } catch {
    return false
  }
}

ipcMain.handle('imagen:elegir', async (_evento, idProducto, reemplazar) => {
  const resultado = await dialog.showOpenDialog(ventana, {
    title: 'Elegir foto de la botella',
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] }],
    properties: ['openFile'],
  })

  if (resultado.canceled || resultado.filePaths.length === 0) return null

  const origen = resultado.filePaths[0]
  const extension = path.extname(origen).toLowerCase() || '.jpg'
  const base = String(idProducto || `foto-${Date.now()}`).replace(/[^\w.-]+/g, '-')
  const nombreArchivo = `${base}${extension}`
  const destino = path.join(carpetaImagenes, nombreArchivo)

  await fs.mkdir(carpetaImagenes, { recursive: true })
  await fs.copyFile(origen, destino)
  await borrarImagenLocal(reemplazar, destino)

  return `img/${nombreArchivo}`
})

/** Guarda un PNG (base64) generado al quitar el fondo. */
ipcMain.handle('imagen:guardar-png', async (_evento, { idProducto, base64, reemplazar }) => {
  const base = String(idProducto || `foto-${Date.now()}`).replace(/[^\w.-]+/g, '-')
  const nombreArchivo = `${base}.png`
  const destino = path.join(carpetaImagenes, nombreArchivo)
  const limpio = String(base64 || '').replace(/^data:image\/\w+;base64,/, '')
  if (!limpio) throw new Error('No llegó la imagen procesada')

  await fs.mkdir(carpetaImagenes, { recursive: true })
  await fs.writeFile(destino, Buffer.from(limpio, 'base64'))
  await borrarImagenLocal(reemplazar, destino)

  return `img/${nombreArchivo}`
})

/** Borra una foto del proyecto (al quitarla del producto). */
ipcMain.handle('imagen:borrar', async (_evento, rutaRelativa) => {
  await borrarImagenLocal(rutaRelativa)
  return true
})

/** Lee una imagen del proyecto y la devuelve como data URL (funciona en .exe y en desarrollo). */
ipcMain.handle('recursos:url', async (_evento, rutaRelativa) => {
  const limpia = String(rutaRelativa || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!limpia || limpia.includes('..')) return ''

  const absoluta = path.join(raizProyecto, 'public', ...limpia.split('/'))
  try {
    const buffer = await fs.readFile(absoluta)
    const ext = path.extname(absoluta).toLowerCase()
    const mime =
      {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
        '.gif': 'image/gif',
      }[ext] || 'application/octet-stream'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
})

ipcMain.handle('sitio:vistaPrevia', async () => {
  await shell.openExternal('http://localhost:5173')
})

ipcMain.handle('sync:estado', async () => estadoSyncCompleto())

ipcMain.handle('catalogo:pdf', async () => {
  const contenido = await fs.readFile(rutaCatalogo, 'utf8')
  const catalogo = JSON.parse(contenido)
  const resultado = await exportarCatalogoPdf({
    catalogo,
    ventanaPadre: ventana && !ventana.isDestroyed() ? ventana : null,
  })
  if (!resultado.cancelado && resultado.ruta) {
    shell.showItemInFolder(resultado.ruta)
  }
  return resultado
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
