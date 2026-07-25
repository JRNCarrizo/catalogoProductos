const http = require('node:http')
const os = require('node:os')
const fs = require('node:fs/promises')

const PUERTO = 3847

function ipsLocales() {
  const nets = os.networkInterfaces()
  const lista = []
  for (const nombre of Object.keys(nets)) {
    for (const red of nets[nombre] || []) {
      if (red.family === 'IPv4' && !red.internal) lista.push(red.address)
    }
  }
  return lista
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function leerJson(req) {
  return new Promise((resolver, rechazar) => {
    const trozos = []
    req.on('data', (trozo) => trozos.push(trozo))
    req.on('end', () => {
      try {
        const bruto = Buffer.concat(trozos).toString('utf8')
        resolver(bruto ? JSON.parse(bruto) : {})
      } catch (error) {
        rechazar(error)
      }
    })
    req.on('error', rechazar)
  })
}

function normalizarProducto(producto) {
  return {
    id: String(producto.id || ''),
    nombre: String(producto.nombre || ''),
    bodega: String(producto.bodega || ''),
    tipo: producto.tipo || 'Tinto',
    variedad: String(producto.variedad || ''),
    anio: producto.anio === null || producto.anio === '' ? null : Number(producto.anio),
    region: String(producto.region || ''),
    precio: Number(producto.precio) || 0,
    precioAnterior:
      producto.precioAnterior === null || producto.precioAnterior === ''
        ? null
        : Number(producto.precioAnterior),
    precioCaja:
      producto.precioCaja === null || producto.precioCaja === '' ? null : Number(producto.precioCaja),
    volumenMl: Number(producto.volumenMl) || 750,
    graduacion:
      producto.graduacion === null || producto.graduacion === '' ? null : Number(producto.graduacion),
    stock: Math.max(0, Number(producto.stock) || 0),
    destacado: Boolean(producto.destacado),
    codigoBarras: String(producto.codigoBarras || ''),
    imagen: String(producto.imagen || ''),
    descripcion: String(producto.descripcion || ''),
    notas: Array.isArray(producto.notas) ? producto.notas.map(String) : [],
    maridaje: String(producto.maridaje || ''),
  }
}

function aplicarCambios(catalogoPc, cambios) {
  const porId = new Map((catalogoPc.productos || []).map((producto) => [producto.id, { ...producto }]))

  for (const cambio of cambios || []) {
    if (cambio.tipo === 'baja') {
      porId.delete(cambio.productoId)
      continue
    }
    if (cambio.producto?.id) {
      porId.set(cambio.producto.id, normalizarProducto(cambio.producto))
    }
  }

  return {
    actualizado: new Date().toISOString(),
    moneda: catalogoPc.moneda || 'ARS',
    productos: [...porId.values()],
  }
}

function fusionarCatalogo(catalogoPc, catalogoCel) {
  const porId = new Map((catalogoPc.productos || []).map((producto) => [producto.id, { ...producto }]))
  for (const producto of catalogoCel.productos || []) {
    if (!producto?.id) continue
    porId.set(producto.id, normalizarProducto(producto))
  }
  return {
    actualizado: new Date().toISOString(),
    moneda: catalogoCel.moneda || catalogoPc.moneda || 'ARS',
    productos: [...porId.values()],
  }
}

/**
 * Servidor HTTP local para que el celular sincronice el catálogo por WiFi.
 */
function crearServidorSync({ rutaCatalogo, rutaPedidos, onSync, onPedido }) {
  let servidor = null

  const manejar = async (req, res) => {
    cors(res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    try {
      if (req.method === 'GET' && (req.url === '/' || req.url === '/api/estado')) {
        const bruto = await fs.readFile(rutaCatalogo, 'utf8')
        const catalogo = JSON.parse(bruto)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            ok: true,
            servicio: 'Vinos de Remate · Panel PC',
            puerto: PUERTO,
            productos: catalogo.productos?.length ?? 0,
            actualizado: catalogo.actualizado ?? null,
            ips: ipsLocales(),
          }),
        )
        return
      }

      if (req.method === 'POST' && req.url === '/api/pedido') {
        const { recibirPedidoPendiente } = require('./pedidos.cjs')
        const cuerpo = await leerJson(req)
        const resultado = await recibirPedidoPendiente({
          rutaCatalogo,
          rutaPedidos,
          texto: cuerpo.texto || cuerpo.codigo || '',
          origen: cuerpo.origen || 'celular',
        })
        if (typeof onPedido === 'function') onPedido(resultado.pedidos)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, yaEstaba: resultado.yaEstaba, pedidos: resultado.pedidos }))
        return
      }

      if (req.method === 'POST' && req.url === '/api/sync') {
        const cuerpo = await leerJson(req)
        const bruto = await fs.readFile(rutaCatalogo, 'utf8')
        const catalogoPc = JSON.parse(bruto)

        let siguiente
        let modo = 'cambios'

        if (cuerpo.reemplazarTodo && cuerpo.catalogo) {
          siguiente = {
            actualizado: new Date().toISOString(),
            moneda: cuerpo.catalogo.moneda || 'ARS',
            productos: (cuerpo.catalogo.productos || []).map(normalizarProducto),
          }
          modo = 'reemplazo'
        } else if (Array.isArray(cuerpo.cambios) && cuerpo.cambios.length > 0) {
          siguiente = aplicarCambios(catalogoPc, cuerpo.cambios)
          modo = 'cambios'
        } else if (cuerpo.catalogo?.productos) {
          siguiente = fusionarCatalogo(catalogoPc, cuerpo.catalogo)
          modo = 'fusion'
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: 'No hay cambios ni catálogo para sincronizar.' }))
          return
        }

        await fs.writeFile(rutaCatalogo, `${JSON.stringify(siguiente, null, 2)}\n`, 'utf8')
        if (typeof onSync === 'function') onSync(siguiente)

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            ok: true,
            modo,
            productos: siguiente.productos.length,
            actualizado: siguiente.actualizado,
          }),
        )
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: 'Ruta no encontrada' }))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Error' }))
    }
  }

  return {
    puerto: PUERTO,
    ips: ipsLocales,
    async iniciar() {
      if (servidor) return { puerto: PUERTO, ips: ipsLocales() }
      await new Promise((resolver, rechazar) => {
        servidor = http.createServer((req, res) => {
          void manejar(req, res)
        })
        servidor.once('error', rechazar)
        servidor.listen(PUERTO, '0.0.0.0', () => {
          servidor.off('error', rechazar)
          resolver()
        })
      })
      return { puerto: PUERTO, ips: ipsLocales() }
    },
    async detener() {
      if (!servidor) return
      await new Promise((resolver) => servidor.close(() => resolver()))
      servidor = null
    },
  }
}

module.exports = { crearServidorSync, PUERTO, ipsLocales }
