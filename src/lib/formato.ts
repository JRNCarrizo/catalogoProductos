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
