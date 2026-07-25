import { sitio } from '../config/sitio'
import type { ItemCarrito, Producto } from '../types'
import { precio } from './formato'

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

export function pedido(items: ItemCarrito[], total: number, nota?: string): string {
  const lineas = items.map(({ producto, cantidad }) => {
    const etiqueta = [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
    return `• ${cantidad} x ${etiqueta} — ${precio(producto.precio * cantidad)}`
  })

  const partes = [
    `Hola ${sitio.nombre}! Quiero hacer este pedido:`,
    '',
    ...lineas,
    '',
    `*Total: ${precio(total)}*`,
  ]

  if (nota?.trim()) partes.push('', `Nota: ${nota.trim()}`)

  return enlace(partes.join('\n'))
}
