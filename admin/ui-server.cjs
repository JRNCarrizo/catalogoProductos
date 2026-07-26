/**
 * Sirve la UI del panel por HTTP local.
 * Evita fallos de WASM/ONNX con el protocolo file:// de Electron.
 *
 * Además hace de proxy con caché en disco para los modelos de "quitar fondo"
 * (`/bg-data/*`), así el navegador nunca sale a internet directamente.
 */
const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

const PUERTO_UI = 3848
const CDN_BG = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
}

function carpetaCacheBg() {
  return path.join(os.homedir(), '.vinos-panel', 'bg-data')
}

/** Devuelve el archivo del modelo desde caché o lo baja de la CDN. */
async function obtenerRecursoBg(rel) {
  const cache = carpetaCacheBg()
  const destino = path.join(cache, rel.replace(/\//g, '_'))

  try {
    const datos = await fs.readFile(destino)
    return datos
  } catch {
    // no está en caché
  }

  const respuesta = await fetch(new URL(rel, CDN_BG))
  if (!respuesta.ok) {
    throw new Error(`No se pudo bajar ${rel}: HTTP ${respuesta.status}`)
  }
  const buffer = Buffer.from(await respuesta.arrayBuffer())
  await fs.mkdir(cache, { recursive: true })
  await fs.writeFile(destino, buffer)
  return buffer
}

function crearServidorUi(carpetaUi) {
  let servidor = null

  async function iniciar() {
    if (servidor) return { puerto: PUERTO_UI, url: `http://127.0.0.1:${PUERTO_UI}/` }

    servidor = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', `http://127.0.0.1:${PUERTO_UI}`)
        let rel = decodeURIComponent(url.pathname)
        if (rel === '/' || rel === '') rel = '/index.html'
        rel = rel.replace(/^\/+/, '')
        if (rel.includes('..')) {
          res.writeHead(400)
          res.end('Ruta inválida')
          return
        }

        if (rel.startsWith('bg-data/')) {
          const recurso = rel.slice('bg-data/'.length)
          try {
            const datos = await obtenerRecursoBg(recurso)
            const ext = path.extname(recurso).toLowerCase()
            res.writeHead(200, {
              'Content-Type': MIME[ext] || 'application/octet-stream',
              'Cache-Control': 'public, max-age=31536000',
            })
            res.end(datos)
          } catch (error) {
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end(error instanceof Error ? error.message : 'Error bajando el modelo')
          }
          return
        }

        const absoluta = path.join(carpetaUi, rel)
        if (!absoluta.startsWith(path.resolve(carpetaUi))) {
          res.writeHead(403)
          res.end('Prohibido')
          return
        }

        const datos = await fs.readFile(absoluta)
        const ext = path.extname(absoluta).toLowerCase()
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        })
        res.end(datos)
      } catch {
        res.writeHead(404)
        res.end('No encontrado')
      }
    })

    await new Promise((resolver, rechazar) => {
      servidor.once('error', rechazar)
      servidor.listen(PUERTO_UI, '127.0.0.1', resolver)
    })

    return { puerto: PUERTO_UI, url: `http://127.0.0.1:${PUERTO_UI}/` }
  }

  async function detener() {
    if (!servidor) return
    await new Promise((resolver) => servidor.close(() => resolver()))
    servidor = null
  }

  return { iniciar, detener }
}

module.exports = { crearServidorUi, PUERTO_UI }
