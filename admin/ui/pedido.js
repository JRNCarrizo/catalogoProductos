/** Código corto de pedido: #3x2,7x1 (índice 1-based en productos.json × cantidad). */

function extraerCodigoPedido(texto) {
  const m = String(texto || '').match(/#(\d+x\d+(?:\s*,\s*\d+x\d+)*)/i)
  if (!m) return null
  return `#${m[1].replace(/\s+/g, '')}`
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
    lineas.push({ indice, cantidad, producto })
  }

  const total = lineas.reduce((acc, linea) => {
    if (!linea.producto) return acc
    return acc + Number(linea.producto.precio || 0) * linea.cantidad
  }, 0)

  return { codigo, lineas, total, errores }
}

function etiquetaProducto(producto) {
  return [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
}

function formatearPesos(valor) {
  return `$${Number(valor || 0).toLocaleString('es-AR')}`
}
