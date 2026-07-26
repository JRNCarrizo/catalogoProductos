/**
 * Quita fondos blancos/claros de fotos de botella (local, sin IA).
 * Usa flood-fill desde los bordes + limpieza de halo blanco en el contorno.
 */
function dataUrlABlob(dataUrl) {
  const partes = String(dataUrl).split(',')
  if (partes.length < 2) throw new Error('Imagen inválida')
  const mime = partes[0].match(/:(.*?);/)?.[1] || 'image/png'
  const binario = atob(partes[1])
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function blobABase64(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => {
      const dataUrl = String(lector.result || '')
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      resolver(base64)
    }
    lector.onerror = () => rechazar(new Error('No se pudo leer el resultado'))
    lector.readAsDataURL(blob)
  })
}

function distanciaAlBlanco(r, g, b) {
  const dr = 255 - r
  const dg = 255 - g
  const db = 255 - b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function luminancia(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function saturacion(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/** Fondo blanco / gris claro de estudio (incluye sombra suave desaturada). */
function esColorDeFondo(r, g, b, umbral) {
  const d = distanciaAlBlanco(r, g, b)
  if (d <= umbral) return true

  const lum = luminancia(r, g, b)
  const sat = saturacion(r, g, b)

  if (lum >= 200 && sat <= 0.16 && d <= umbral + 60) return true
  if (lum >= 170 && sat <= 0.09 && d <= umbral + 85) return true
  return false
}

function vecinosTransparentes(data, width, height, x, y) {
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        n++
        continue
      }
      if (data[(ny * width + nx) * 4 + 3] === 0) n++
    }
  }
  return n
}

/**
 * Quita el “halo” blanco del anti-aliasing: descompone el color
 * como si estuviera mezclado sobre fondo blanco.
 */
function descontaminarBlancoEnBorde(data, width, height) {
  const total = width * height
  const alphaNuevo = new Uint8Array(total)
  const rgbNuevo = new Uint8ClampedArray(total * 3)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const i = idx * 4
      const a = data[i + 3]
      if (a === 0) {
        alphaNuevo[idx] = 0
        continue
      }

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const borde = vecinosTransparentes(data, width, height, x, y)

      if (!borde) {
        alphaNuevo[idx] = a
        rgbNuevo[idx * 3] = r
        rgbNuevo[idx * 3 + 1] = g
        rgbNuevo[idx * 3 + 2] = b
        continue
      }

      // Cobertura estimada respecto al blanco (anti-alias / fringe).
      const maxDiff = Math.max(255 - r, 255 - g, 255 - b)
      let cobertura = maxDiff / 255

      // Halos casi blancos: fuera.
      if (cobertura < 0.06 || (luminancia(r, g, b) >= 232 && saturacion(r, g, b) <= 0.12)) {
        alphaNuevo[idx] = 0
        continue
      }

      // En el borde, un poco más agresivo si aún es claro.
      if (luminancia(r, g, b) >= 210 && saturacion(r, g, b) <= 0.18) {
        cobertura *= 0.55
      } else if (luminancia(r, g, b) >= 185 && saturacion(r, g, b) <= 0.14) {
        cobertura *= 0.75
      }

      // Más vecinos transparentes → más probabilidad de fringe.
      if (borde >= 4) cobertura *= 0.85
      if (borde >= 6) cobertura *= 0.8

      if (cobertura < 0.05) {
        alphaNuevo[idx] = 0
        continue
      }

      // Desmezclar del blanco: C = F*α + 255*(1-α)
      const inv = 1 / Math.max(cobertura, 0.08)
      const nr = Math.max(0, Math.min(255, Math.round(255 + (r - 255) * inv)))
      const ng = Math.max(0, Math.min(255, Math.round(255 + (g - 255) * inv)))
      const nb = Math.max(0, Math.min(255, Math.round(255 + (b - 255) * inv)))

      alphaNuevo[idx] = Math.max(0, Math.min(255, Math.round(a * cobertura)))
      rgbNuevo[idx * 3] = nr
      rgbNuevo[idx * 3 + 1] = ng
      rgbNuevo[idx * 3 + 2] = nb
    }
  }

  for (let idx = 0; idx < total; idx++) {
    const i = idx * 4
    data[i] = rgbNuevo[idx * 3]
    data[i + 1] = rgbNuevo[idx * 3 + 1]
    data[i + 2] = rgbNuevo[idx * 3 + 2]
    data[i + 3] = alphaNuevo[idx]
  }
}

/**
 * Erosión suave: come 1–2 px de borde claro (el “mal cortado”).
 */
function erosionarHaloClaro(data, width, height, umbral) {
  const total = width * height
  const marcar = new Uint8Array(total)

  for (let pass = 0; pass < 2; pass++) {
    marcar.fill(0)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const i = idx * 4
        if (data[i + 3] === 0) continue

        const borde = vecinosTransparentes(data, width, height, x, y)
        if (!borde) continue

        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const d = distanciaAlBlanco(r, g, b)
        const lum = luminancia(r, g, b)
        const sat = saturacion(r, g, b)

        // Píxeles claros / desaturados pegados al vacío = halo.
        const esHalo =
          d <= umbral + 36 ||
          (lum >= 198 && sat <= 0.2) ||
          (lum >= 175 && sat <= 0.12 && borde >= 2) ||
          (borde >= 5 && lum >= 160 && sat <= 0.22)

        if (esHalo) marcar[idx] = 1
      }
    }

    for (let idx = 0; idx < total; idx++) {
      if (marcar[idx]) data[idx * 4 + 3] = 0
    }
  }
}

/**
 * @param {ImageData} imageData
 * @param {number} umbral distancia máxima al blanco (0–255).
 */
function quitarFondoClaro(imageData, umbral = 56) {
  const { data, width, height } = imageData
  const total = width * height
  const visitado = new Uint8Array(total)
  const cola = new Int32Array(total)
  let inicio = 0
  let fin = 0

  const esFondo = (pixel) => {
    const i = pixel * 4
    return esColorDeFondo(data[i], data[i + 1], data[i + 2], umbral)
  }

  const encolar = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visitado[idx] || !esFondo(idx)) return
    visitado[idx] = 1
    cola[fin++] = idx
  }

  for (let x = 0; x < width; x++) {
    encolar(x, 0)
    encolar(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    encolar(0, y)
    encolar(width - 1, y)
  }

  while (inicio < fin) {
    const idx = cola[inicio++]
    const x = idx % width
    const y = (idx / width) | 0
    data[idx * 4 + 3] = 0
    encolar(x + 1, y)
    encolar(x - 1, y)
    encolar(x, y + 1)
    encolar(x, y - 1)
  }

  // Expansión del vacío hacia píxeles claros del contorno (anti-alias).
  erosionarHaloClaro(data, width, height, umbral)

  // Descontaminar blanco restante en el borde.
  descontaminarBlancoEnBorde(data, width, height)

  // Suavizado final de alpha solo en el perímetro.
  const alphaFinal = new Uint8Array(total)
  for (let idx = 0; idx < total; idx++) alphaFinal[idx] = data[idx * 4 + 3]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const i = idx * 4
      if (data[i + 3] === 0) continue
      const borde = vecinosTransparentes(data, width, height, x, y)
      if (!borde) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const d = distanciaAlBlanco(r, g, b)
      if (d >= umbral + 40 && luminancia(r, g, b) < 200) continue

      const t = Math.min(1, d / (umbral + 40))
      const factor = 0.25 + 0.75 * t
      const vecinoFactor = Math.max(0.35, 1 - borde * 0.08)
      alphaFinal[idx] = Math.max(0, Math.min(255, Math.round(data[i + 3] * factor * vecinoFactor)))
    }
  }

  for (let idx = 0; idx < total; idx++) data[idx * 4 + 3] = alphaFinal[idx]
}

async function procesarBlob(entrada, onProgreso) {
  if (typeof onProgreso === 'function') onProgreso('Quitando el fondo blanco…')

  const bitmap = await createImageBitmap(entrada)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo procesar la imagen')

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  quitarFondoClaro(imageData)
  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise((resolver, rechazar) => {
    canvas.toBlob((resultado) => {
      if (resultado) resolver(resultado)
      else rechazar(new Error('No se pudo generar el PNG'))
    }, 'image/png')
  })

  return blob
}

/**
 * @param {string} dataUrl imagen de entrada (data:…)
 * @param {(texto: string) => void} [onProgreso]
 * @returns {Promise<string>} PNG en base64 (sin prefijo data:)
 */
window.quitarFondoDesdeDataUrl = async function quitarFondoDesdeDataUrl(dataUrl, onProgreso) {
  const entrada = dataUrlABlob(dataUrl)
  const blob = await procesarBlob(entrada, onProgreso)
  return blobABase64(blob)
}
