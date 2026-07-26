import { sitio } from '../config/sitio'
import type { ItemCarrito, Producto } from '../types'
import { precio, precioUnitario, subtotalLinea } from './formato'
import { codificarPedido } from './pedidoCodigo'

function enlace(mensaje: string): string {
  return `https://wa.me/${sitio.whatsapp}?text=${encodeURIComponent(mensaje)}`
}

export function consultaProducto(producto: Producto): string {
  const etiqueta = [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
  return enlace(
    `Hola ${sitio.nombre}! Quiero consultar por *${etiqueta}* (${precio(producto.precio)}). ¿Tienen stock?`,
  )
}

export function consultaGeneral(): string {
  return enlace(`Hola ${sitio.nombre}! Estuve viendo el catálogo y quería hacer una consulta.`)
}

/** `catalogo` es la lista completa (mismo orden que productos.json) para armar el código corto. */
export function pedido(
  items: ItemCarrito[],
  total: number,
  catalogo: Producto[],
  nota?: string,
): string {
  const lineas = items.map(({ producto, cantidad }) => {
    const etiqueta = [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
    const unitario = precioUnitario(producto, cantidad)
    const promo = cantidad >= 2 && producto.precioCaja != null ? ` (${precio(unitario)} c/u)` : ''
    return `• ${cantidad} x ${etiqueta} — ${precio(subtotalLinea(producto, cantidad))}${promo}`
  })

  const codigo = codificarPedido(
    items.map(({ producto, cantidad }) => ({ id: producto.id, cantidad })),
    catalogo,
  )

  // Un producto por línea y el total abajo. Los saltos (\n → %0A) los respeta WhatsApp.
  const partes = [
    `Hola ${sitio.nombre}! Quiero hacer este pedido:`,
    '',
    ...lineas,
    '',
    `*Total: ${precio(total)}*`,
  ]

  if (nota?.trim()) partes.push('', `Nota: ${nota.trim()}`)
  if (codigo) partes.push('', codigo)

  return enlace(partes.join('\n'))
}
