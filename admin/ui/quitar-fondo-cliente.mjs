/**
 * Cliente de quitar fondo (WASM). Expone window.quitarFondoDesdeDataUrl.
 * La primera vez descarga el modelo desde la CDN de IMG.LY; después queda en caché.
 */
import { removeBackground } from './vendor/bg-removal.js'

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

/**
 * @param {string} dataUrl imagen de entrada (data:…)
 * @param {(texto: string) => void} [onProgreso]
 * @returns {Promise<string>} PNG en base64 (sin prefijo data:)
 */
window.quitarFondoDesdeDataUrl = async function quitarFondoDesdeDataUrl(dataUrl, onProgreso) {
  if (typeof onProgreso === 'function') {
    onProgreso('Quitando el fondo… (la primera vez descarga el modelo)')
  }

  // Importante: no pasar data: URL a la lib (la trata como ruta relativa y hace fetch roto).
  const entrada = dataUrlABlob(dataUrl)

  const blob = await removeBackground(entrada, {
    // El panel proxea y cachea el modelo (evita CORS/CSP del navegador).
    publicPath: `${window.location.origin}/bg-data/`,
    model: 'small', // isnet_quint8: más liviano / primera descarga más chica
    proxyToWorker: false,
    device: 'cpu',
    output: {
      format: 'image/png',
      quality: 0.92,
      type: 'foreground',
    },
    progress: (_clave, actual, total) => {
      if (typeof onProgreso !== 'function' || !total) return
      const pct = Math.min(100, Math.round((actual / total) * 100))
      if (pct === 0 || pct === 100 || pct % 20 === 0) {
        onProgreso(`Quitando el fondo… ${pct}%`)
      }
    },
  })

  return blobABase64(blob)
}
