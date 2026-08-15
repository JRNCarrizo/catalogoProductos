/**
 * Publica cambios del colector (APK) al catálogo en GitHub.
 *
 * Env en Netlify:
 *   COLECTOR_CLAVE   — clave compartida (misma que guardan en la APK)
 *   GITHUB_TOKEN     — PAT con permiso de Contents (escritura) en el repo
 *   GITHUB_REPO      — opcional, default JRNCarrizo/catalogoProductos
 *   GITHUB_BRANCH    — opcional, default main
 *   GITHUB_PATH      — opcional, default public/data/productos.json
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-colector-clave',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status, cuerpo) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(cuerpo),
  }
}

function claveOk(event) {
  const esperada = (process.env.COLECTOR_CLAVE || '').trim()
  if (!esperada) return false
  const recibida =
    event.headers['x-colector-clave'] ||
    event.headers['X-Colector-Clave'] ||
    ''
  return String(recibida).trim() === esperada
}

function consolidar(cambios) {
  const mapa = new Map()
  for (const cambio of cambios || []) {
    if (!cambio?.productoId) continue
    mapa.set(cambio.productoId, cambio)
  }
  return [...mapa.values()]
}

function sinImagen(producto) {
  if (!producto || typeof producto !== 'object') return null
  return { ...producto, imagen: '' }
}

function aplicarCambios(catalogo, cambios) {
  const productos = [...(catalogo.productos || [])]
  const porId = new Map(productos.map((p, i) => [p.id, i]))

  let altas = 0
  let ediciones = 0
  let bajas = 0

  for (const cambio of consolidar(cambios)) {
    const idx = porId.get(cambio.productoId)

    if (cambio.tipo === 'baja') {
      if (idx == null) continue
      const actual = productos[idx]
      productos[idx] = { ...actual, activo: false }
      bajas += 1
      continue
    }

    if (cambio.tipo === 'alta') {
      const nuevo = sinImagen(cambio.producto)
      if (!nuevo?.id || !nuevo.nombre?.trim()) continue
      if (idx == null) {
        productos.push({ ...nuevo, imagen: '' })
        porId.set(nuevo.id, productos.length - 1)
        altas += 1
      } else {
        const actual = productos[idx]
        productos[idx] = { ...nuevo, imagen: actual.imagen || '' }
        ediciones += 1
      }
      continue
    }

    // edicion: stock y datos simples; nunca pisa la foto del panel
    if (cambio.tipo === 'edicion') {
      const remoto = cambio.producto
      if (!remoto) continue
      if (idx == null) {
        productos.push({ ...sinImagen(remoto), imagen: '' })
        porId.set(remoto.id, productos.length - 1)
        altas += 1
      } else {
        const actual = productos[idx]
        productos[idx] = {
          ...actual,
          ...remoto,
          imagen: actual.imagen || '',
        }
        ediciones += 1
      }
    }
  }

  return {
    catalogo: {
      ...catalogo,
      actualizado: new Date().toISOString(),
      moneda: catalogo.moneda || 'ARS',
      productos,
    },
    altas,
    ediciones,
    bajas,
  }
}

async function leerArchivoGithub({ token, repo, branch, path }) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vinos-colector',
    },
  })
  if (!res.ok) {
    const texto = await res.text()
    throw new Error(`GitHub leer ${res.status}: ${texto.slice(0, 200)}`)
  }
  const datos = await res.json()
  const contenido = Buffer.from(datos.content.replace(/\n/g, ''), 'base64').toString('utf8')
  return { sha: datos.sha, catalogo: JSON.parse(contenido) }
}

async function escribirArchivoGithub({ token, repo, branch, path, sha, catalogo, mensaje }) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`
  const body = {
    message: mensaje,
    content: Buffer.from(`${JSON.stringify(catalogo, null, 2)}\n`, 'utf8').toString('base64'),
    sha,
    branch,
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'vinos-colector',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const texto = await res.text()
    const err = new Error(`GitHub escribir ${res.status}: ${texto.slice(0, 240)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Usá POST' })
  }
  if (!claveOk(event)) {
    return json(401, { ok: false, error: 'Clave incorrecta' })
  }

  const token = (process.env.GITHUB_TOKEN || '').trim()
  const repo = (process.env.GITHUB_REPO || 'JRNCarrizo/catalogoProductos').trim()
  const branch = (process.env.GITHUB_BRANCH || 'main').trim()
  const path = (process.env.GITHUB_PATH || 'public/data/productos.json').trim()

  if (!token) {
    return json(500, { ok: false, error: 'Falta GITHUB_TOKEN en Netlify' })
  }

  let cuerpo
  try {
    cuerpo = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON inválido' })
  }

  const cambios = Array.isArray(cuerpo.cambios) ? cuerpo.cambios : []
  if (cambios.length === 0) {
    return json(400, { ok: false, error: 'No hay cambios para publicar' })
  }

  try {
    let intento = 0
    while (intento < 2) {
      intento += 1
      const { sha, catalogo } = await leerArchivoGithub({ token, repo, branch, path })
      const { catalogo: siguiente, altas, ediciones, bajas } = aplicarCambios(catalogo, cambios)

      if (altas + ediciones + bajas === 0) {
        return json(400, { ok: false, error: 'Ningún cambio válido para aplicar' })
      }

      const mensaje =
        String(cuerpo.mensaje || '').trim() ||
        `Colector: ${altas} altas, ${ediciones} ediciones, ${bajas} bajas`

      try {
        await escribirArchivoGithub({
          token,
          repo,
          branch,
          path,
          sha,
          catalogo: siguiente,
          mensaje,
        })
        return json(200, {
          ok: true,
          altas,
          ediciones,
          bajas,
          productos: siguiente.productos.length,
        })
      } catch (error) {
        if (error.status === 409 && intento < 2) continue
        throw error
      }
    }
    return json(409, { ok: false, error: 'Conflicto al guardar; reintentá' })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Error al publicar',
    })
  }
}
