import { useEffect, useState } from 'react'
import type { Catalogo } from '../types'
import { recurso } from '../lib/rutas'

type Estado =
  | { cargando: true; error: null; catalogo: null }
  | { cargando: false; error: string; catalogo: null }
  | { cargando: false; error: null; catalogo: Catalogo }

export function useCatalogo(): Estado {
  const [estado, setEstado] = useState<Estado>({ cargando: true, error: null, catalogo: null })

  useEffect(() => {
    const controlador = new AbortController()

    // El parámetro evita que el navegador sirva una versión vieja tras publicar.
    fetch(`${recurso('data/productos.json')}?v=${Date.now()}`, { signal: controlador.signal })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
        return respuesta.json() as Promise<Catalogo>
      })
      .then((catalogo) => setEstado({ cargando: false, error: null, catalogo }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setEstado({ cargando: false, error: 'No pudimos cargar el catálogo.', catalogo: null })
      })

    return () => controlador.abort()
  }, [])

  return estado
}
