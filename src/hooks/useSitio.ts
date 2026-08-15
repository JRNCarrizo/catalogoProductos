import { useMemo } from 'react'
import { sitioDesdeRuta, type SitioActivo } from '../config/sitio'

/** Sitio según la URL actual (/ → Jorge, /leandro → Leandro). */
export function useSitio(): SitioActivo {
  return useMemo(() => sitioDesdeRuta(), [])
}
