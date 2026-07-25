type Props = React.SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export function IconoCarrito(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 4h2.2l2.3 11.2a1.8 1.8 0 0 0 1.8 1.4h8.4a1.8 1.8 0 0 0 1.8-1.4L21 8H6" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17.5" cy="20" r="1.3" />
    </svg>
  )
}

export function IconoBuscar(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function IconoCerrar(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconoWhatsApp(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.92.54 3.72 1.5 5.26L2 22l5.06-1.64a9.9 9.9 0 0 0 4.98 1.34c5.44 0 9.84-4.4 9.84-9.84S17.48 2 12.04 2Zm0 17.9c-1.6 0-3.1-.44-4.38-1.24l-.32-.2-3 .98.98-2.92-.22-.34a7.98 7.98 0 0 1-1.24-4.3 8.1 8.1 0 1 1 8.18 8.02Zm4.5-5.86c-.24-.12-1.44-.7-1.66-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06a6.56 6.56 0 0 1-1.92-1.18 7.2 7.2 0 0 1-1.34-1.66c-.14-.24-.02-.38.1-.5.12-.12.26-.3.38-.46.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.66 4.12 3.62 2.02.8 2.42.64 2.86.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  )
}

export function IconoCopa(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h10l-.7 6a4.4 4.4 0 0 1-8.6 0Z" />
      <path d="M12 15v6M8.5 21h7" />
    </svg>
  )
}

export function IconoMenu(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconoFlechaAbajo(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  )
}

export function IconoCheck(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  )
}

export function IconoCamion(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  )
}

export function IconoEtiqueta(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 12.5 12 21l-8.5-8.5V4H12z" />
      <circle cx="8" cy="8" r="1.2" />
    </svg>
  )
}
