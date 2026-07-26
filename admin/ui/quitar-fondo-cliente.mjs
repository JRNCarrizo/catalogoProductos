/**
 * Quita fondos blancos/claros de fotos de botella (local, sin IA).
 * Usa flood-fill desde los bordes para no “agujerear” etiquetas claras.
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

/** Fondo blanco / gris claro de estudio (incluye sombra suave desaturada). */
function esColorDeFondo(r, g, b, umbral) {
  const d = distanciaAlBlanco(r, g, b)
  if (d <= umbral) return true

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b
  const saturacion = max === 0 ? 0 : (max - min) / max

  // Sombras suaves sobre papel blanco: claras y poco saturadas.
  if (luminancia >= 205 && saturacion <= 0.14 && d <= umbral + 55) return true
  if (luminancia >= 175 && saturacion <= 0.08 && d <= umbral + 80) return true
  return false
}

/**
 * @param {ImageData} imageData
 * @param {number} umbral distancia máxima al blanco (0–255). ~48 cubre blanco sucio/grisáceo.
 */
function quitarFondoClaro(imageData, umbral = 48) {
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

  // Solo el fondo conectado a los bordes (protege blancos internos de la etiqueta).
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

  // Limpieza de manchas: píxeles claros casi rodeados de transparencia.
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const i = idx * 4
        if (data[i + 3] === 0) continue
        if (!esColorDeFondo(data[i], data[i + 1], data[i + 2], umbral + 22)) continue

        let vecinosTransp = 0
        if (data[((y - 1) * width + x) * 4 + 3] === 0) vecinosTransp++
        if (data[((y + 1) * width + x) * 4 + 3] === 0) vecinosTransp++
        if (data[(y * width + x - 1) * 4 + 3] === 0) vecinosTransp++
        if (data[(y * width + x + 1) * 4 + 3] === 0) vecinosTransp++
        if (vecinosTransp >= 3) data[i + 3] = 0
      }
    }
  }

  // Suavizado solo en el borde (píxeles claros pegados a transparente).
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const i = idx * 4
      if (data[i + 3] === 0) continue

      let vecinosTransp = 0
      if (data[((y - 1) * width + x) * 4 + 3] === 0) vecinosTransp++
      if (data[((y + 1) * width + x) * 4 + 3] === 0) vecinosTransp++
      if (data[(y * width + x - 1) * 4 + 3] === 0) vecinosTransp++
      if (data[(y * width + x + 1) * 4 + 3] === 0) vecinosTransp++
      if (!vecinosTransp) continue

      const d = distanciaAlBlanco(data[i], data[i + 1], data[i + 2])
      if (d >= umbral + 28) continue
      // Más blanco / más vecinos transparentes → más transparente el borde.
      const t = Math.min(1, d / (umbral + 28))
      const factor = 0.35 + 0.65 * t
      const vecinoFactor = 1 - vecinosTransp * 0.12
      data[i + 3] = Math.max(0, Math.min(255, Math.round(data[i + 3] * factor * vecinoFactor)))
    }
  }
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
