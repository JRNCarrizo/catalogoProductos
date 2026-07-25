import { Capacitor } from '@capacitor/core'
import {
  BarcodeScanner,
  BarcodeFormat,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning'

/** En Android, `scan()` necesita el módulo de Google (se descarga una sola vez). */
async function asegurarModuloGoogle(onEstado?: (msg: string) => void): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
  if (available) return

  onEstado?.('Primera vez: descargando el escáner de Google…')

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let listener: { remove: () => Promise<void> } | undefined

    const settle = (error?: Error) => {
      if (settled) return
      settled = true
      void listener?.remove().catch(() => undefined)
      if (error) reject(error)
      else resolve()
    }

    void BarcodeScanner.addListener('googleBarcodeScannerModuleInstallProgress', (event) => {
      if (typeof event.progress === 'number' && event.progress > 0) {
        onEstado?.(`Descargando escáner… ${Math.round(event.progress)}%`)
      }
      if (event.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) {
        settle()
      } else if (
        event.state === GoogleBarcodeScannerModuleInstallState.FAILED ||
        event.state === GoogleBarcodeScannerModuleInstallState.CANCELED
      ) {
        settle(
          new Error(
            'No se pudo instalar el escáner. Conectate a internet e intentá de nuevo (solo hace falta la primera vez).',
          ),
        )
      }
    })
      .then((handle) => {
        listener = handle
        return BarcodeScanner.installGoogleBarcodeScannerModule()
      })
      .catch((error) => {
        settle(error instanceof Error ? error : new Error(String(error)))
      })
  })

  onEstado?.('Escáner listo')
}

export async function escanearCodigo(
  onEstado?: (msg: string) => void,
): Promise<string | null> {
  // En el navegador (PC) no hay cámara nativa: se pide el código a mano.
  if (!Capacitor.isNativePlatform()) {
    const manual = window.prompt('Ingresá el código de barras (modo prueba en PC)')
    return manual?.trim() || null
  }

  await asegurarModuloGoogle(onEstado)

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
