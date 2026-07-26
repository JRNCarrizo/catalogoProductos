import type { Producto } from './types'

export type LineaPedido = {
  indice: number
  cantidad: number
  producto: Producto | null
}

export type PedidoResuelto = {
  codigo: string
  lineas: LineaPedido[]
  total: number
  errores: string[]
}

export function extraerCodigoPedido(texto: string): string | null {
  const m = texto.match(/#(\d+x\d+(?:\s*,\s*\d+x\d+)*)/i)
  if (!m) return null
  return `#${m[1].replace(/\s+/g, '')}`
}

export function parsearPedido(texto: string, productos: Producto[]): PedidoResuelto {
  const codigo = extraerCodigoPedido(texto)
  if (!codigo) {
    return { codigo: '', lineas: [], total: 0, errores: ['No encontré un código de pedido (#1x2,3x1).'] }
  }

  const cuerpo = codigo.slice(1)
  const errores: string[] = []
  const lineas: LineaPedido[] = []

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
    return acc + subtotalLinea(linea.producto, linea.cantidad)
  }, 0)

  return { codigo, lineas, total, errores }
}

function precioUnitario(producto: Producto, cantidad: number): number {
  const promo = producto.precioCaja
  if (cantidad >= 2 && promo != null && Number.isFinite(promo) && promo >= 0) {
    return promo
  }
  return producto.precio || 0
}

export function subtotalLinea(producto: Producto, cantidad: number): number {
  return precioUnitario(producto, cantidad) * cantidad
}

export function etiquetaProducto(producto: Producto): string {
  return [producto.nombre, producto.variedad, producto.anio].filter(Boolean).join(' · ')
}

/** Arma un código #índicexcant a partir de líneas elegidas (índice = posición en el catálogo). */
export function armarPedidoDesdeLineas(
  lineas: { producto: Producto; cantidad: number }[],
  catalogo: Producto[],
): PedidoResuelto {
  const errores: string[] = []
  const resueltas: LineaPedido[] = []
  const partes: string[] = []

  for (const linea of lineas) {
    if (linea.cantidad < 1) continue
    const indice = catalogo.findIndex((p) => p.id === linea.producto.id)
    if (indice < 0) {
      errores.push(`No está en el catálogo: ${linea.producto.nombre}`)
      continue
    }
    const nro = indice + 1
    partes.push(`${nro}x${linea.cantidad}`)
    resueltas.push({ indice: nro, cantidad: linea.cantidad, producto: linea.producto })
  }

  if (!partes.length) {
    return {
      codigo: '',
      lineas: [],
      total: 0,
      errores: errores.length ? errores : ['Agregá al menos un producto.'],
    }
  }

  const codigo = `#${partes.join(',')}`
  const total = resueltas.reduce((acc, linea) => {
    if (!linea.producto) return acc
    return acc + subtotalLinea(linea.producto, linea.cantidad)
  }, 0)

  return { codigo, lineas: resueltas, total, errores }
}
