import type { Producto } from './types'
import { leerIpPc } from './storage'

export type SugerenciaProducto = Partial<
  Pick<
    Producto,
    | 'nombre'
    | 'bodega'
    | 'tipo'
    | 'variedad'
    | 'anio'
    | 'region'
    | 'volumenMl'
    | 'graduacion'
    | 'descripcion'
    | 'notas'
    | 'maridaje'
    | 'codigoBarras'
  >
>

export type ResultadoSugerencia = {
  ok: boolean
  fuentes: string[]
  sugerencia: SugerenciaProducto
  aviso: string
  error?: string
}

const TIPOS = ['Tinto', 'Blanco', 'Rosado', 'Espumante', 'Dulce', 'Otro'] as const

function mapearTipo(texto: string): Producto['tipo'] | null {
  const t = texto.toLowerCase()
  if (/espum|sparkling|champagne|prosecco|cava/.test(t)) return 'Espumante'
  if (/ros[eé]|blush/.test(t)) return 'Rosado'
  if (/blanc|white|chardonnay|sauvignon|torront|riesling|viognier/.test(t)) return 'Blanco'
  if (/dulce|sweet|late harvest|cosecha tard/.test(t)) return 'Dulce'
  if (/tint|red|malbec|cabernet|merlot|syrah|pinot|bonarda|tempranillo/.test(t)) return 'Tinto'
  return null
}

function limpiar(valor: unknown): string {
  return String(valor || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Open Food Facts directo (internet del celular, sin panel). */
export async function sugerirDesdeCodigoBarras(codigo: string): Promise<ResultadoSugerencia> {
  const limpio = codigo.replace(/\D/g, '')
  if (limpio.length < 8) {
    throw new Error('El código de barras parece incompleto.')
  }

  const respuesta = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(limpio)}.json`,
    { headers: { 'User-Agent': 'VinosDeRemate-Colector/1.0' } },
  )
  if (!respuesta.ok) throw new Error(`Open Food Facts HTTP ${respuesta.status}`)
  const datos = (await respuesta.json()) as {
    status: number
    product?: Record<string, unknown>
  }
  if (datos.status !== 1 || !datos.product) {
    throw new Error('No encontré ese código. Probá completar con IA (necesita el panel abierto).')
  }

  const p = datos.product
  const categorias = [p.categories, Array.isArray(p.categories_tags) ? p.categories_tags.join(' ') : '', p.generic_name, p.product_name]
    .filter(Boolean)
    .join(' ')

  const brands = limpiar(p.brands)
  const quantity = limpiar(p.quantity)
  const mlMatch = quantity.match(/(\d+)\s*ml/i)
  const tipo = mapearTipo(categorias) || mapearTipo(limpiar(p.product_name))
  const nombre = limpiar(p.product_name || p.generic_name)

  let variedad = ''
  const m = nombre.match(
    /(malbec|cabernet\s*sauvignon|cabernet\s*franc|merlot|syrah|shiraz|pinot\s*noir|bonarda|tempranillo|chardonnay|sauvignon\s*blanc|torront[eé]s|blend|cabernet\s*malbec)/i,
  )
  if (m) variedad = m[1].replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const sugerencia: SugerenciaProducto = {
    nombre: nombre || undefined,
    bodega: brands.split(',')[0]?.trim() || undefined,
    tipo: tipo || undefined,
    variedad: variedad || undefined,
    region: [p.origins, p.manufacturing_places, p.countries].map(limpiar).filter(Boolean).join(', ') || undefined,
    volumenMl: mlMatch ? Number(mlMatch[1]) : Number(p.product_quantity) || undefined,
    graduacion:
      typeof p.alcohol_100g === 'number'
        ? p.alcohol_100g
        : typeof (p.nutriments as { alcohol?: number } | undefined)?.alcohol === 'number'
          ? (p.nutriments as { alcohol: number }).alcohol
          : null,
    descripcion: limpiar(p.generic_name || p.ingredients_text) || undefined,
    codigoBarras: limpio,
  }

  return {
    ok: true,
    fuentes: ['openfoodfacts'],
    sugerencia,
    aviso: 'Datos de Open Food Facts. Revisá antes de guardar.',
  }
}

/** Pide al panel (Gemini + OFF combinados). Requiere Sync PC / panel abierto. */
export async function sugerirDesdePanel(
  entrada: {
    codigoBarras?: string
    nombre?: string
    bodega?: string
    variedad?: string
    tipo?: string
    forzarIa?: boolean
  },
  puerto = 3847,
): Promise<ResultadoSugerencia> {
  const host = await leerIpPc()
  if (!host) {
    throw new Error('Configurá la IP de la PC en Sync PC para usar IA (la clave Gemini vive en el panel).')
  }
  const limpio = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = `http://${limpio.includes(':') ? limpio : `${limpio}:${puerto}`}`
  const respuesta = await fetch(`${base}/api/sugerir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entrada),
  })
  const datos = (await respuesta.json()) as ResultadoSugerencia & { error?: string }
  if (!respuesta.ok || datos.ok === false) {
    throw new Error(datos.error || datos.aviso || `No se pudo sugerir (HTTP ${respuesta.status})`)
  }
  return datos
}

/** Solo rellena campos vacíos. Nunca toca precio ni stock. */
export function aplicarSugerencia(producto: Producto, sugerencia: SugerenciaProducto): Producto {
  const siguiente = { ...producto }
  const vacio = (valor: unknown) =>
    valor == null || valor === '' || (Array.isArray(valor) && valor.length === 0)

  const campos: (keyof SugerenciaProducto)[] = [
    'nombre',
    'bodega',
    'tipo',
    'variedad',
    'anio',
    'region',
    'volumenMl',
    'graduacion',
    'descripcion',
    'notas',
    'maridaje',
    'codigoBarras',
  ]

  for (const campo of campos) {
    const valor = sugerencia[campo]
    if (valor == null || valor === '') continue
    if (campo === 'tipo' && typeof valor === 'string' && !TIPOS.includes(valor as (typeof TIPOS)[number])) {
      continue
    }
    if (campo === 'volumenMl' && (!vacio(producto.volumenMl) && producto.volumenMl !== 750)) continue
    if (campo === 'volumenMl' || vacio(producto[campo as keyof Producto])) {
      ;(siguiente as Record<string, unknown>)[campo] = valor
    }
  }

  return siguiente
}
