const fs = require('node:fs/promises')
const path = require('node:path')

const TIPOS = ['Tinto', 'Blanco', 'Rosado', 'Espumante', 'Dulce', 'Otro']

/** Se actualiza al iniciar el panel (carpeta admin del proyecto). */
let rutaConfigGemini = path.join(__dirname, 'config.local.json')

function configurarRutaGemini(carpetaAdmin) {
  rutaConfigGemini = path.join(carpetaAdmin, 'config.local.json')
}

/**
 * Campos que se pueden sugerir. Nunca precio ni stock.
 * @typedef {object} SugerenciaProducto
 * @property {string} [nombre]
 * @property {string} [bodega]
 * @property {string} [tipo]
 * @property {string} [variedad]
 * @property {number|null} [anio]
 * @property {string} [region]
 * @property {number} [volumenMl]
 * @property {number|null} [graduacion]
 * @property {string} [descripcion]
 * @property {string[]} [notas]
 * @property {string} [maridaje]
 * @property {string} [codigoBarras]
 */

async function leerClaveGemini() {
  try {
    const bruto = await fs.readFile(rutaConfigGemini, 'utf8')
    const config = JSON.parse(bruto)
    const clave = String(config.geminiApiKey || config.GEMINI_API_KEY || '').trim()
    return clave || null
  } catch {
    return null
  }
}

function mapearTipo(texto) {
  const t = String(texto || '').toLowerCase()
  if (/espum|sparkling|champagne|prosecco|cava/.test(t)) return 'Espumante'
  if (/ros[eé]|blush/.test(t)) return 'Rosado'
  if (/blanc|white|chardonnay|sauvignon|torront|riesling|viognier/.test(t)) return 'Blanco'
  if (/dulce|sweet|late harvest|cosecha tard/.test(t)) return 'Dulce'
  if (/tint|red|malbec|cabernet|merlot|syrah|pinot|bonarda|tempranillo/.test(t)) return 'Tinto'
  return null
}

function limpiarTexto(valor) {
  return String(valor || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsearNotas(valor) {
  if (Array.isArray(valor)) {
    return valor.map((n) => limpiarTexto(n)).filter(Boolean).slice(0, 8)
  }
  return String(valor || '')
    .split(/[,;|/·•]+/)
    .map((n) => limpiarTexto(n))
    .filter(Boolean)
    .slice(0, 8)
}

function normalizarSugerencia(parcial) {
  /** @type {SugerenciaProducto} */
  const out = {}
  if (parcial.nombre) out.nombre = limpiarTexto(parcial.nombre)
  if (parcial.bodega) out.bodega = limpiarTexto(parcial.bodega)
  if (parcial.tipo && TIPOS.includes(parcial.tipo)) out.tipo = parcial.tipo
  else if (parcial.tipo) {
    const mapeado = mapearTipo(parcial.tipo)
    if (mapeado) out.tipo = mapeado
  }
  if (parcial.variedad) out.variedad = limpiarTexto(parcial.variedad)
  if (parcial.anio != null && parcial.anio !== '') {
    const anio = Number(parcial.anio)
    if (anio >= 1900 && anio <= 2100) out.anio = anio
  }
  if (parcial.region) out.region = limpiarTexto(parcial.region)
  if (parcial.volumenMl != null && parcial.volumenMl !== '') {
    const ml = Number(parcial.volumenMl)
    if (ml > 0 && ml < 10000) out.volumenMl = ml
  }
  if (parcial.graduacion != null && parcial.graduacion !== '') {
    const g = Number(parcial.graduacion)
    if (g > 0 && g < 30) out.graduacion = Math.round(g * 10) / 10
  }
  if (parcial.descripcion) out.descripcion = limpiarTexto(parcial.descripcion)
  const notas = parsearNotas(parcial.notas)
  if (notas.length) out.notas = notas
  if (parcial.maridaje) out.maridaje = limpiarTexto(parcial.maridaje)
  if (parcial.codigoBarras) out.codigoBarras = limpiarTexto(parcial.codigoBarras)
  return out
}

/**
 * Open Food Facts por código de barras (gratis, sin clave).
 * @param {string} codigo
 */
async function sugerirDesdeCodigoBarras(codigo) {
  const limpio = String(codigo || '').replace(/\D/g, '')
  if (limpio.length < 8) {
    throw new Error('El código de barras parece incompleto.')
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(limpio)}.json`
  const respuesta = await fetch(url, {
    headers: { 'User-Agent': 'VinosDeRemate-Panel/1.0 (contacto: JRNcarrizo@gmail.com)' },
  })
  if (!respuesta.ok) {
    throw new Error(`Open Food Facts no respondió (HTTP ${respuesta.status}).`)
  }
  const datos = await respuesta.json()
  if (datos.status !== 1 || !datos.product) {
    throw new Error('No encontré ese código en Open Food Facts. Probá completar con IA por el nombre.')
  }

  const p = datos.product
  const categorias = [
    p.categories,
    p.categories_tags?.join(' '),
    p.generic_name,
    p.product_name,
  ]
    .filter(Boolean)
    .join(' ')

  const sugerencia = normalizarSugerencia({
    nombre: p.product_name || p.generic_name || p.abbreviated_product_name,
    bodega: p.brands?.split(',')[0]?.trim() || p.brand_owner,
    tipo: mapearTipo(categorias) || mapearTipo(p.product_name),
    variedad: '',
    region: [p.origins, p.manufacturing_places, p.countries].filter(Boolean).join(', '),
    volumenMl: p.quantity?.match(/(\d+)\s*ml/i)?.[1] || p.product_quantity || null,
    graduacion: p.alcohol_100g ?? p.nutriments?.alcohol ?? null,
    descripcion: p.generic_name || p.ingredients_text || '',
    notas: [],
    maridaje: '',
    codigoBarras: limpio,
  })

  // Intentar variedad desde el nombre
  if (!sugerencia.variedad && sugerencia.nombre) {
    const m = sugerencia.nombre.match(
      /(malbec|cabernet\s*sauvignon|cabernet\s*franc|merlot|syrah|shiraz|pinot\s*noir|bonarda|tempranillo|chardonnay|sauvignon\s*blanc|torront[eé]s|blend|cabernet\s*malbec)/i,
    )
    if (m) sugerencia.variedad = m[1].replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return {
    origen: 'openfoodfacts',
    sugerencia,
    aviso: 'Datos de Open Food Facts. Revisá y completá lo que falte (maridaje suele venir vacío).',
  }
}

/**
 * Gemini (API key gratis en Google AI Studio) a partir del nombre / bodega.
 * @param {{ nombre?: string, bodega?: string, variedad?: string, tipo?: string, codigoBarras?: string, apiKey?: string }} entrada
 */
async function sugerirDesdeIa(entrada) {
  const clave = (entrada.apiKey && String(entrada.apiKey).trim()) || (await leerClaveGemini())
  if (!clave) {
    throw new Error(
      'Falta la clave de Gemini. Creá admin/config.local.json con { "geminiApiKey": "TU_CLAVE" } (gratis en Google AI Studio).',
    )
  }

  const pista = [entrada.nombre, entrada.bodega, entrada.variedad, entrada.tipo, entrada.codigoBarras]
    .map((x) => limpiarTexto(x))
    .filter(Boolean)
    .join(' · ')

  if (!pista) {
    throw new Error('Necesito al menos el nombre del vino (o bodega + variedad) para buscar con IA.')
  }

  const prompt = `Sos un experto en vinos argentinos y de remate/consumo. A partir de esta pista de un vino, devolvé SOLO un JSON válido (sin markdown) con estos campos:
{
  "nombre": "string",
  "bodega": "string",
  "tipo": "Tinto|Blanco|Rosado|Espumante|Dulce|Otro",
  "variedad": "string",
  "anio": number|null,
  "region": "string",
  "volumenMl": number,
  "graduacion": number|null,
  "descripcion": "2 a 4 oraciones en español, tono comercial limpio",
  "notas": ["nota1", "nota2", "nota3"],
  "maridaje": "comidas típicas en español, separadas por coma"
}
Reglas:
- Usá información realista y típica de ese vino/estilo. Si no conocés la botella exacta, basate en la variedad/bodega/región más probable.
- No inventes precios ni stock.
- Si no sabés el año, usá null.
- volumenMl por defecto 750 si no sabés.
- Respondé solo el JSON.

Pista: ${pista}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(clave)}`
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
  })

  const datos = await respuesta.json()
  if (!respuesta.ok) {
    const msg = datos?.error?.message || `Gemini HTTP ${respuesta.status}`
    throw new Error(msg)
  }

  const texto = datos?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || ''
  const jsonMatch = texto.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('La IA no devolvió un JSON usable. Probá de nuevo.')
  }

  let parseado
  try {
    parseado = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('No pude leer la respuesta de la IA.')
  }

  const sugerencia = normalizarSugerencia({
    ...parseado,
    codigoBarras: entrada.codigoBarras || undefined,
  })

  return {
    origen: 'gemini',
    sugerencia,
    aviso: 'Sugerencia de IA. Revisá siempre antes de guardar (puede aproximar si el vino es poco conocido).',
  }
}

/**
 * Combina: si hay código intenta OFF; completa huecos con IA si hay clave / se pide.
 * @param {{ codigoBarras?: string, nombre?: string, bodega?: string, variedad?: string, tipo?: string, forzarIa?: boolean, apiKey?: string }} entrada
 */
async function sugerirDatosProducto(entrada) {
  const codigo = String(entrada.codigoBarras || '').replace(/\D/g, '')
  /** @type {SugerenciaProducto} */
  let sugerencia = {}
  const fuentes = []
  const avisos = []

  if (codigo.length >= 8 && !entrada.forzarIa) {
    try {
      const off = await sugerirDesdeCodigoBarras(codigo)
      sugerencia = { ...off.sugerencia }
      fuentes.push('openfoodfacts')
      avisos.push(off.aviso)
    } catch (error) {
      avisos.push(error instanceof Error ? error.message : 'Falló Open Food Facts')
    }
  }

  const faltanDatosClave =
    !sugerencia.nombre ||
    !sugerencia.descripcion ||
    !sugerencia.maridaje ||
    !(sugerencia.notas && sugerencia.notas.length)

  const quiereIa =
    entrada.forzarIa ||
    faltanDatosClave ||
    (!codigo && (entrada.nombre || entrada.bodega || entrada.variedad))

  if (quiereIa) {
    try {
      const ia = await sugerirDesdeIa({
        nombre: entrada.nombre || sugerencia.nombre,
        bodega: entrada.bodega || sugerencia.bodega,
        variedad: entrada.variedad || sugerencia.variedad,
        tipo: entrada.tipo || sugerencia.tipo,
        codigoBarras: codigo || entrada.codigoBarras,
        apiKey: entrada.apiKey,
      })
      // OFF gana en campos que ya trajo; IA completa vacíos
      for (const [clave, valor] of Object.entries(ia.sugerencia)) {
        const actual = sugerencia[clave]
        const vacio =
          actual == null ||
          actual === '' ||
          (Array.isArray(actual) && actual.length === 0) ||
          (clave === 'volumenMl' && actual === 750 && ia.sugerencia.volumenMl)
        if (vacio && valor != null && valor !== '') {
          sugerencia[clave] = valor
        }
      }
      fuentes.push('gemini')
      avisos.push(ia.aviso)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falló la IA'
      if (!fuentes.length) throw new Error(msg)
      avisos.push(msg)
    }
  }

  if (!Object.keys(sugerencia).length) {
    throw new Error(
      avisos[0] ||
        'No pude sugerir datos. Probá con código de barras o nombre, y configurá Gemini si querés IA.',
    )
  }

  return {
    ok: true,
    fuentes,
    sugerencia,
    aviso: avisos.filter(Boolean).join(' '),
  }
}

/**
 * Mezcla sugerencia solo en campos vacíos del producto actual.
 * Nunca toca precio, stock, destacado, id, imagen.
 */
function aplicarSugerencia(productoActual, sugerencia, { sobrescribir = false } = {}) {
  const actual = productoActual || {}
  const siguiente = { ...actual }
  const campos = [
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
    if (sugerencia[campo] == null || sugerencia[campo] === '') continue
    const valorActual = actual[campo]
    const vacio =
      valorActual == null ||
      valorActual === '' ||
      (Array.isArray(valorActual) && valorActual.length === 0) ||
      (campo === 'volumenMl' && (!valorActual || valorActual === 750) && sugerencia.volumenMl)
    if (sobrescribir || vacio) {
      siguiente[campo] = sugerencia[campo]
    }
  }

  return siguiente
}

module.exports = {
  leerClaveGemini,
  configurarRutaGemini,
  sugerirDesdeCodigoBarras,
  sugerirDesdeIa,
  sugerirDatosProducto,
  aplicarSugerencia,
}
