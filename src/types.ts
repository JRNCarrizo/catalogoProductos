export type TipoVino = 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante' | 'Dulce' | 'Otro'

export interface Producto {
  id: string
  nombre: string
  bodega: string
  tipo: TipoVino
  variedad: string
  anio: number | null
  region: string
  /** Precio de venta en pesos. */
  precio: number
  /** Precio de referencia. Null si no se muestra. */
  precioAnterior: number | null
  /** Precio por unidad al comprar varias. Null si no aplica. */
  precioCaja: number | null
  volumenMl: number
  graduacion: number | null
  stock: number
  destacado: boolean
  /**
   * Si es false, no se muestra en la web (sigue en panel/APK).
   * Si falta el campo, se trata como activo.
   */
  activo?: boolean
  /** Código de barras / EAN. Varios productos (cosechas) pueden compartir el mismo. */
  codigoBarras: string
  /** URL o ruta relativa de la foto. Vacío muestra una etiqueta ilustrada. */
  imagen: string
  descripcion: string
  notas: string[]
  maridaje: string
}

export interface Catalogo {
  actualizado: string
  moneda: string
  productos: Producto[]
}

export interface ItemCarrito {
  producto: Producto
  cantidad: number
}
