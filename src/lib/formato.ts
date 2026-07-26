const formateadorPesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export function precio(valor: number): string {
  return formateadorPesos.format(valor)
}

export function fechaLegible(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function porcentajeDescuento(precioActual: number, precioAnterior: number): number {
  return Math.round((1 - precioActual / precioAnterior) * 100)
}

/**
 * Precio por unidad según cantidad.
 * Con 1 unidad: precio normal. Desde 2, si hay precioCaja, aplica esa promo.
 */
export function precioUnitario(
  producto: { precio: number; precioCaja: number | null },
  cantidad: number,
): number {
  const promo = producto.precioCaja
  if (cantidad >= 2 && promo != null && Number.isFinite(promo) && promo >= 0) {
    return Number(promo)
  }
  return Number(producto.precio) || 0
}

export function subtotalLinea(
  producto: { precio: number; precioCaja: number | null },
  cantidad: number,
): number {
  return precioUnitario(producto, cantidad) * cantidad
}

export function aplicaPromoCantidad(
  producto: { precioCaja: number | null },
  cantidad: number,
): boolean {
  return cantidad >= 2 && producto.precioCaja != null && Number.isFinite(producto.precioCaja)
}
