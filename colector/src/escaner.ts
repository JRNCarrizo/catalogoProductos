import { Capacitor } from '@capacitor/core'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'

export async function escanearCodigo(): Promise<string | null> {
  // En el navegador (PC) no hay cámara nativa: se pide el código a mano.
  if (!Capacitor.isNativePlatform()) {
    const manual = window.prompt('Ingresá el código de barras (modo prueba en PC)')
    return manual?.trim() || null
  }

  const { camera } = await BarcodeScanner.requestPermissions()
  if (camera !== 'granted' && camera !== 'limited') {
    throw new Error('Necesitamos permiso de cámara para escanear.')
  }

  document.body.classList.add('escaneo-activo')

  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.QrCode,
      ],
    })
    return barcodes[0]?.rawValue?.trim() || null
  } finally {
    document.body.classList.remove('escaneo-activo')
  }
}
