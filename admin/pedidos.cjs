const fs = require('node:fs/promises')
const path = require('node:path')

function extraerCodigoPedido(texto) {
  const m = String(texto || '').match(/#(\d+x\d+(?:\s*,\s*\d+x\d+)*)/i)
  if (!m) return null
  return `#${m[1].replace(/\s+/g, '')}`
}

function precioUnitario(producto, cantidad) {
  const promo = producto?.precioCaja
  if (cantidad >= 2 && promo != null && promo !== '' && Number.isFinite(Number(promo)) && Number(promo) >= 0) {
    return Number(promo)
  }
  return Number(producto?.precio) || 0
}

function subtotalLinea(producto, cantidad) {
  return precioUnitario(producto, cantidad) * cantidad
}

function parsearPedido(texto, productos) {
  const codigo = extraerCodigoPedido(texto)
  if (!codigo) {
    return { codigo: '', lineas: [], total: 0, errores: ['No encontré un código de pedido (#1x2,3x1).'] }
  }

  const cuerpo = codigo.slice(1)
  const errores = []
  const lineas = []

  for (const parte of cuerpo.split(',')) {
    const m = /^(\d+)x(\d+)$/i.exec(parte.trim())
    if (!m) {
      errores.push(`Fragmento inválido: ${parte}`)
      continue
    }
    const indice = Number(m[1])
    const cantidad = Number(m[2])
    if (indice < 1 || cantidad < 1) {
      errores.push(`Valores inválidos en ${parte}`)
      continue
    }
    const producto = productos[indice - 1] ?? null
    if (!producto) errores.push(`No hay producto #${indice} en el catálogo`)
    const unitario = producto ? precioUnitario(producto, cantidad) : 0
    lineas.push({
      indice,
      cantidad,
      productoId: producto?.id || null,
      nombre: producto ? [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ') : `#${indice}`,
      precio: unitario,
      stock: producto ? Number(producto.stock) || 0 : 0,
      producto,
    })
  }

  const total = lineas.reduce((acc, linea) => acc + linea.precio * linea.cantidad, 0)
  return { codigo, lineas, total, errores }
}

function archivoVacio() {
  return { pendientes: [], historial: [] }
}

async function leerPedidos(ruta) {
  try {
    const bruto = await fs.readFile(ruta, 'utf8')
    const datos = JSON.parse(bruto)
    return {
      pendientes: Array.isArray(datos.pendientes) ? datos.pendientes : [],
      historial: Array.isArray(datos.historial) ? datos.historial : [],
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') return archivoVacio()
    throw error
  }
}

async function guardarPedidos(ruta, datos) {
  await fs.mkdir(path.dirname(ruta), { recursive: true })
  await fs.writeFile(ruta, `${JSON.stringify(datos, null, 2)}\n`, 'utf8')
}

function descontarStock(catalogo, lineas) {
  const productos = (catalogo.productos || []).map((p) => ({ ...p }))
  const avisos = []

  for (const linea of lineas) {
    const producto = productos[linea.indice - 1]
    if (!producto) {
      avisos.push(`Falta producto #${linea.indice}`)
      continue
    }
    const stock = Math.max(0, Number(producto.stock) || 0)
    if (stock < linea.cantidad) {
      avisos.push(`${producto.nombre}: pedían ${linea.cantidad}, hay ${stock}`)
    }
    producto.stock = Math.max(0, stock - linea.cantidad)
  }

  return {
    catalogo: {
      ...catalogo,
      actualizado: new Date().toISOString(),
      productos,
    },
    avisos,
  }
}

function devolverStock(catalogo, items) {
  const productos = (catalogo.productos || []).map((p) => ({ ...p }))
  const porId = new Map(productos.map((p) => [p.id, p]))
  for (const item of items || []) {
    const producto = porId.get(item.productoId)
    if (!producto) continue
    producto.stock = Math.max(0, (Number(producto.stock) || 0) + Number(item.cantidad || 0))
  }
  return {
    ...catalogo,
    actualizado: new Date().toISOString(),
    productos,
  }
}

/**
 * Confirma un pedido: descuenta stock y lo mueve al historial.
 */
async function confirmarPedido({ rutaCatalogo, rutaPedidos, texto, pendienteId, origen }) {
  const bruto = await fs.readFile(rutaCatalogo, 'utf8')
  const catalogo = JSON.parse(bruto)
  const pedidos = await leerPedidos(rutaPedidos)

  let codigo = ''
  let resuelto

  if (pendienteId) {
    const pendiente = pedidos.pendientes.find((p) => p.id === pendienteId)
    if (!pendiente) throw new Error('No encontré ese pedido pendiente.')
    codigo = pendiente.codigo
    resuelto = parsearPedido(codigo, catalogo.productos)
  } else {
    resuelto = parsearPedido(texto || '', catalogo.productos)
    codigo = resuelto.codigo
  }

  if (!codigo || resuelto.errores.length) {
    throw new Error(resuelto.errores[0] || 'Código de pedido inválido.')
  }

  if (pedidos.historial.some((h) => h.codigo === codigo && h.estado === 'confirmado')) {
    throw new Error(`El pedido ${codigo} ya fue confirmado antes.`)
  }

  if (resuelto.lineas.some((l) => !l.producto)) {
    throw new Error('Hay productos del código que ya no están en el catálogo.')
  }

  const { catalogo: siguiente, avisos } = descontarStock(catalogo, resuelto.lineas)
  await fs.writeFile(rutaCatalogo, `${JSON.stringify(siguiente, null, 2)}\n`, 'utf8')

  const registro = {
    id: `ped-${Date.now()}`,
    codigo,
    fecha: new Date().toISOString(),
    estado: 'confirmado',
    origen: origen || 'panel',
    total: resuelto.total,
    items: resuelto.lineas.map((l) => ({
      productoId: l.productoId,
      indice: l.indice,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio: l.precio,
    })),
    avisos,
  }

  pedidos.historial.unshift(registro)
  if (pendienteId) {
    pedidos.pendientes = pedidos.pendientes.filter((p) => p.id !== pendienteId)
  } else {
    pedidos.pendientes = pedidos.pendientes.filter((p) => p.codigo !== codigo)
  }
  // Mantener historial razonable
  if (pedidos.historial.length > 300) pedidos.historial = pedidos.historial.slice(0, 300)

  await guardarPedidos(rutaPedidos, pedidos)
  return { catalogo: siguiente, pedidos, registro, avisos }
}

async function recibirPedidoPendiente({ rutaCatalogo, rutaPedidos, texto, origen }) {
  const bruto = await fs.readFile(rutaCatalogo, 'utf8')
  const catalogo = JSON.parse(bruto)
  const resuelto = parsearPedido(texto || '', catalogo.productos)

  if (!resuelto.codigo || resuelto.errores.length) {
    throw new Error(resuelto.errores[0] || 'Código de pedido inválido.')
  }
  if (resuelto.lineas.some((l) => !l.producto)) {
    throw new Error('Hay productos del código que no están en el catálogo de la PC.')
  }

  const pedidos = await leerPedidos(rutaPedidos)
  if (pedidos.historial.some((h) => h.codigo === resuelto.codigo && h.estado === 'confirmado')) {
    throw new Error(`El pedido ${resuelto.codigo} ya fue confirmado.`)
  }
  if (pedidos.pendientes.some((p) => p.codigo === resuelto.codigo)) {
    return { pedidos, yaEstaba: true }
  }

  pedidos.pendientes.unshift({
    id: `pen-${Date.now()}`,
    codigo: resuelto.codigo,
    fecha: new Date().toISOString(),
    origen: origen || 'celular',
    total: resuelto.total,
    items: resuelto.lineas.map((l) => ({
      productoId: l.productoId,
      indice: l.indice,
      nombre: l.nombre,
      cantidad: l.cantidad,
      precio: l.precio,
      stock: l.stock,
    })),
  })

  await guardarPedidos(rutaPedidos, pedidos)
  return { pedidos, yaEstaba: false }
}

async function descartarPendiente(rutaPedidos, pendienteId) {
  const pedidos = await leerPedidos(rutaPedidos)
  pedidos.pendientes = pedidos.pendientes.filter((p) => p.id !== pendienteId)
  await guardarPedidos(rutaPedidos, pedidos)
  return pedidos
}

async function anularPedido({ rutaCatalogo, rutaPedidos, pedidoId }) {
  const pedidos = await leerPedidos(rutaPedidos)
  const registro = pedidos.historial.find((h) => h.id === pedidoId)
  if (!registro) throw new Error('No encontré ese pedido.')
  if (registro.estado !== 'confirmado') throw new Error('Ese pedido no está confirmado.')

  const bruto = await fs.readFile(rutaCatalogo, 'utf8')
  const catalogo = JSON.parse(bruto)
  const siguiente = devolverStock(catalogo, registro.items)
  await fs.writeFile(rutaCatalogo, `${JSON.stringify(siguiente, null, 2)}\n`, 'utf8')

  registro.estado = 'anulado'
  registro.anuladoEn = new Date().toISOString()
  await guardarPedidos(rutaPedidos, pedidos)
  return { catalogo: siguiente, pedidos, registro }
}

module.exports = {
  extraerCodigoPedido,
  parsearPedido,
  leerPedidos,
  confirmarPedido,
  recibirPedidoPendiente,
  descartarPendiente,
  anularPedido,
}
