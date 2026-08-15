import { useEffect, useState } from 'react'
import { useSitio } from '../hooks/useSitio'
import { consultaGeneral } from '../lib/whatsapp'
import { IconoCarrito, IconoCopa, IconoWhatsApp } from './iconos'

interface Props {
  unidades: number
  onAbrirCarrito: () => void
}

const enlaces = [
  { href: '#catalogo', texto: 'Catálogo' },
  { href: '#contacto', texto: 'Contacto' },
]

export function Encabezado({ unidades, onAbrirCarrito }: Props) {
  const sitio = useSitio()
  const [compacto, setCompacto] = useState(false)

  useEffect(() => {
    const alScrollear = () => setCompacto(window.scrollY > 24)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        compacto
          ? 'border-b border-white/10 bg-noche-950/95 lg:bg-noche-950/90 lg:backdrop-blur-md'
          : 'border-b border-transparent bg-gradient-to-b from-noche-950/80 to-transparent'
      }`}
    >
      <div className="contenedor flex h-16 items-center justify-between gap-4 sm:h-18">
        <a href="#inicio" className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-oro-400/40 text-oro-300 transition group-hover:border-oro-300 group-hover:text-oro-200">
            <IconoCopa className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold tracking-wide text-crema">
              {sitio.nombre}
            </span>
            <span className="block text-[11px] tracking-[0.22em] text-humo uppercase">{sitio.lema}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {enlaces.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="relative text-sm text-humo transition hover:text-crema after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-oro-400 after:transition-all after:duration-300 hover:after:w-full"
            >
              {enlace.texto}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={consultaGeneral()}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-crema transition hover:border-oro-400/60 hover:text-oro-200 sm:flex"
          >
            <IconoWhatsApp className="size-4" />
            Escribinos
          </a>

          <button
            type="button"
            onClick={onAbrirCarrito}
            className="relative flex items-center gap-2 rounded-full bg-vino-600 px-4 py-2 text-sm font-medium text-crema transition hover:bg-vino-500"
          >
            <IconoCarrito className="size-5" />
            <span className="hidden sm:inline">Mi pedido</span>
            {unidades > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-oro-400 text-[11px] font-semibold text-noche-950">
                {unidades}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
