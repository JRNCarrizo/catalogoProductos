import { useEffect } from 'react'

/** Cierra con Escape y bloquea el scroll del fondo mientras la capa está abierta. */
export function useSuperposicion(abierta: boolean, onCerrar: () => void) {
  useEffect(() => {
    if (!abierta) return

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar()
    }

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', alPresionar)

    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener('keydown', alPresionar)
    }
  }, [abierta, onCerrar])
}
