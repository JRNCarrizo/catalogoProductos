import type { Producto } from '../types'

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

/** Arma el código corto `#3x2,7x1` según el orden del catálogo (1 = primer vino). */
export function codificarPedido(
  items: { id: string; cantidad: number }[],
  productos: { id: string }[],
): string {
  const partes: string[] = []
  for (const item of items) {
    const idx = productos.findIndex((p) => p.id === item.id)
    if (idx < 0 || item.cantidad <= 0) continue
    partes.push(`${idx + 1}x${item.cantidad}`)
  }
  return partes.length ? `#${partes.join(',')}` : ''
}

/** Busca `#1x2,3x1` en un mensaje pegado (WhatsApp entero o solo el código). */
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
    return acc + linea.producto.precio * linea.cantidad
  }, 0)

  return { codigo, lineas, total, errores }
}

export function etiquetaProducto(producto: Producto): string {
  return [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
}
