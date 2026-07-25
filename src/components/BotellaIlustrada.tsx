import type { TipoVino } from '../types'

const colores: Record<TipoVino, { vidrio: string; liquido: string; etiqueta: string }> = {
  Tinto: { vidrio: '#20321f', liquido: '#5d1422', etiqueta: '#f2e7d5' },
  Blanco: { vidrio: '#3d4a2a', liquido: '#d9c67a', etiqueta: '#faf4e6' },
  Rosado: { vidrio: '#4a3340', liquido: '#d98b9a', etiqueta: '#fbf0ef' },
  Espumante: { vidrio: '#2a2d3a', liquido: '#e0cf92', etiqueta: '#f4f1e8' },
  Dulce: { vidrio: '#3a2b1e', liquido: '#c98a3c', etiqueta: '#f7ecd8' },
  Otro: { vidrio: '#2b2b2b', liquido: '#7f1d2e', etiqueta: '#f2ece2' },
}

interface Props {
  tipo: TipoVino
  bodega: string
  variedad: string
  className?: string
}

/** Ilustración que se usa cuando el producto todavía no tiene foto cargada. */
export function BotellaIlustrada({ tipo, bodega, variedad, className }: Props) {
  const color = colores[tipo] ?? colores.Otro
  const iniciales = bodega
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <svg viewBox="0 0 120 260" className={className} role="img" aria-label={`${variedad} ${tipo}`}>
      <defs>
        <linearGradient id={`brillo-${tipo}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <path
        d="M50 12h20v52c0 8 22 20 22 44v134a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V108c0-24 22-36 22-44Z"
        fill={color.vidrio}
      />
      <path
        d="M50 12h20v52c0 8 22 20 22 44v134a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V108c0-24 22-36 22-44Z"
        fill={`url(#brillo-${tipo})`}
      />
      <path d="M28 150h64v78a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10Z" fill={color.liquido} opacity="0.85" />
      <rect x="46" y="6" width="28" height="12" rx="3" fill="#1b1114" />

      <rect x="30" y="158" width="60" height="58" rx="2" fill={color.etiqueta} />
      <text
        x="60"
        y="184"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontSize="19"
        fill="#3a2226"
      >
        {iniciales}
      </text>
      <text x="60" y="200" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fill="#7a5a5f">
        {tipo.toUpperCase()}
      </text>
      <rect x="38" y="206" width="44" height="1" fill="#b9a08f" />
    </svg>
  )
}
