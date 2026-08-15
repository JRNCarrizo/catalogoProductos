export type TipoVino = 'Tinto' | 'Blanco' | 'Rosado' | 'Espumante' | 'Dulce' | 'Otro'

export interface Producto {
  id: string
  nombre: string
  bodega: string
  tipo: TipoVino
  variedad: string
  anio: number | null
  region: string
  precio: number
  precioAnterior: number | null
  precioCaja: number | null
  volumenMl: number
  graduacion: number | null
  stock: number
  destacado: boolean
  /** false = oculto en la web. Si falta, se trata como activo. */
  activo?: boolean
  codigoBarras: string
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

export type CambioTipo = 'alta' | 'edicion' | 'baja'

/** Cola de sync hacia la PC (capa lista para el futuro WiFi/nube). */
export interface CambioPendiente {
  id: string
  tipo: CambioTipo
  productoId: string
  producto: Producto | null
  fecha: string
}

export const TIPOS: TipoVino[] = ['Tinto', 'Blanco', 'Rosado', 'Espumante', 'Dulce', 'Otro']

export const CATALOGO_ONLINE = 'https://vinosderemate.netlify.app/data/productos.json'

/** Endpoint Netlify para publicar stock / altas desde la APK. */
export const API_PUBLICAR = 'https://vinosderemate.netlify.app/api/colector-publicar'

export function productoVacio(parcial: Partial<Producto> = {}): Producto {
  return {
    id: '',
    nombre: '',
    bodega: '',
    tipo: 'Tinto',
    variedad: '',
    anio: null,
    region: '',
    precio: 0,
    precioAnterior: null,
    precioCaja: null,
    volumenMl: 750,
    graduacion: null,
    stock: 0,
    destacado: false,
    activo: true,
    codigoBarras: '',
    imagen: '',
    descripcion: '',
    notas: [],
    maridaje: '',
    ...parcial,
  }
}

/** Productos sin el campo (catálogos viejos) se consideran activos. */
export function estaActivo(producto: Pick<Producto, 'activo'>): boolean {
  return producto.activo !== false
}

export function generarId(producto: Producto, existentes: Set<string>): string {
  const base = [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let candidato = slug || `vino-${Date.now()}`
  let contador = 2
  while (existentes.has(candidato)) candidato = `${slug}-${contador++}`
  return candidato
}

export function buscarPorCodigo(productos: Producto[], codigo: string): Producto[] {
  const limpio = codigo.trim()
  if (!limpio) return []
  return productos.filter((producto) => (producto.codigoBarras || '').trim() === limpio)
}

export function precio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)
}
