/**
 * Resuelve rutas de archivos servidos desde /public respetando el base path
 * con el que se publicó el sitio (Netlify usa /, GitHub Pages usaría /repo/).
 */
export function recurso(ruta: string): string {
  if (!ruta) return ''
  if (/^(https?:)?\/\//.test(ruta) || ruta.startsWith('data:')) return ruta
  const base = import.meta.env.BASE_URL
  return `${base.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`
}
