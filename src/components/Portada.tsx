import { useState } from 'react'
import { sitio } from '../config/sitio'
import { BotellaIlustrada } from './BotellaIlustrada'
import { IconoFlechaAbajo, IconoWhatsApp } from './iconos'
import { consultaGeneral } from '../lib/whatsapp'
import { recurso } from '../lib/rutas'

interface Props {
  cantidadEtiquetas: number
  cantidadBodegas: number
}

function VisualPortada({
  foto,
  fotoOk,
  onError,
  variante,
}: {
  foto: string
  fotoOk: boolean
  onError: () => void
  variante: 'mobile' | 'desktop'
}) {
  const esMobile = variante === 'mobile'

  return (
    <div
      className={
        esMobile
          ? 'relative mx-auto mt-6 mb-1 flex w-full max-w-md justify-center lg:hidden'
          : 'relative hidden items-center justify-start lg:flex'
      }
    >
      <div
        className={
          esMobile
            ? 'absolute bottom-4 left-1/2 h-16 w-56 -translate-x-1/2 rounded-[50%] bg-black/55 blur-2xl'
            : 'absolute bottom-8 left-[40%] h-24 w-72 -translate-x-1/2 rounded-[50%] bg-black/60 blur-3xl'
        }
      />
      {foto && fotoOk ? (
        <img
          src={foto}
          alt={`${sitio.nombre} — portada`}
          className={
            esMobile
              ? 'relative z-10 h-auto w-[92%] max-w-[22rem] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]'
              : 'relative z-10 -ml-6 h-auto w-[95%] max-w-[32rem] object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,0.65)] xl:-ml-10'
          }
          onError={onError}
        />
      ) : (
        <div className={`relative z-10 flex ${esMobile ? 'h-56 scale-75' : ''}`}>
          <BotellaIlustrada
            tipo="Tinto"
            bodega="Catena Zapata"
            variedad="Malbec"
            className={esMobile ? 'h-56' : 'h-[30rem] drop-shadow-[0_35px_60px_rgba(0,0,0,0.65)]'}
          />
          <BotellaIlustrada
            tipo="Blanco"
            bodega="Alamos"
            variedad="Chardonnay"
            className={
              esMobile
                ? '-ml-10 h-48 self-end'
                : '-ml-16 h-[25rem] self-end drop-shadow-[0_35px_60px_rgba(0,0,0,0.65)]'
            }
          />
        </div>
      )}
    </div>
  )
}

export function Portada({ cantidadEtiquetas, cantidadBodegas }: Props) {
  const [fotoOk, setFotoOk] = useState(true)
  const foto = sitio.hero.imagen ? recurso(sitio.hero.imagen) : ''
  const onError = () => setFotoOk(false)

  return (
    <section id="inicio" className="relative overflow-x-clip pt-24 pb-16 sm:pt-28 sm:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-vino-700/35 blur-[120px]" />
        <div className="absolute top-24 -right-24 size-[26rem] rounded-full bg-oro-500/12 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
      </div>

      <div className="contenedor grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 xl:gap-10">
        <div className="animar-aparecer">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-oro-400/30 bg-oro-400/5 px-4 py-1.5 text-[11px] tracking-[0.2em] text-oro-200 uppercase">
            {sitio.hero.volanta}
          </p>

          <h1 className="text-center font-display text-4xl leading-[1.12] font-semibold sm:text-6xl lg:text-left lg:text-7xl">
            {sitio.hero.titulo}
            <br />
            <span className="texto-oro italic">{sitio.hero.tituloDestacado}</span>
          </h1>

          <VisualPortada foto={foto} fotoOk={fotoOk} onError={onError} variante="mobile" />

          <p className="mt-5 max-w-xl text-base leading-relaxed text-humo sm:mt-7 sm:text-lg">
            {sitio.hero.subtitulo}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
            <a
              href="#catalogo"
              className="group inline-flex items-center gap-2 rounded-full bg-crema px-7 py-3.5 text-sm font-semibold tracking-wide text-noche-950 transition hover:bg-oro-200"
            >
              Ver el catálogo
              <IconoFlechaAbajo className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
            <a
              href={consultaGeneral()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-crema transition hover:border-oro-400/60 hover:text-oro-200"
            >
              <IconoWhatsApp className="size-4" />
              Consultar
            </a>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6 sm:mt-14 sm:gap-6 sm:pt-8">
            <div className="text-center">
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Disponibles</dt>
              <dd className="font-display text-3xl text-oro-200">{cantidadEtiquetas}</dd>
            </div>
            <div className="text-center">
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Marcas</dt>
              <dd className="font-display text-3xl text-oro-200">{cantidadBodegas}</dd>
            </div>
            <div className="text-center">
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Pedidos</dt>
              <dd className="font-display text-2xl leading-tight text-oro-200 sm:text-3xl">WhatsApp</dd>
            </div>
          </dl>
        </div>

        <VisualPortada foto={foto} fotoOk={fotoOk} onError={onError} variante="desktop" />
      </div>
    </section>
  )
}
