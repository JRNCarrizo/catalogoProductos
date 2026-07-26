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

  if (esMobile) {
    return (
      <div className="relative mx-auto mt-6 mb-1 flex w-full max-w-md justify-center lg:hidden">
        {foto && fotoOk ? (
          <img
            src={foto}
            alt={`${sitio.nombre} — portada`}
            className="relative z-10 h-auto w-[92%] max-w-[22rem] object-contain"
            onError={onError}
          />
        ) : (
          <div className="relative z-10 flex h-56 scale-75">
            <BotellaIlustrada tipo="Tinto" bodega="Catena Zapata" variedad="Malbec" className="h-56" />
            <BotellaIlustrada tipo="Blanco" bodega="Alamos" variedad="Chardonnay" className="-ml-10 h-48 self-end" />
          </div>
        )}
      </div>
    )
  }

  // Desktop: fuera del flujo, no empuja ni aplasta el texto de la izquierda.
  return (
    <div className="pointer-events-none absolute top-1/2 right-0 z-0 hidden w-[48%] -translate-y-[58%] justify-end lg:flex xl:w-[50%]">
      {foto && fotoOk ? (
        <img
          src={foto}
          alt={`${sitio.nombre} — portada`}
          className="relative z-10 h-[30rem] w-auto max-w-full object-contain [filter:drop-shadow(0_22px_16px_rgba(247,241,232,0.38))_drop-shadow(0_10px_12px_rgba(212,175,83,0.22))] xl:h-[36rem] xl:translate-x-4 2xl:h-[40rem] 2xl:translate-x-8"
          onError={onError}
        />
      ) : (
        <div className="relative z-10 flex">
          <BotellaIlustrada
            tipo="Tinto"
            bodega="Catena Zapata"
            variedad="Malbec"
            className="h-[30rem] drop-shadow-[0_35px_60px_rgba(0,0,0,0.65)]"
          />
          <BotellaIlustrada
            tipo="Blanco"
            bodega="Alamos"
            variedad="Chardonnay"
            className="-ml-16 h-[25rem] self-end drop-shadow-[0_35px_60px_rgba(0,0,0,0.65)]"
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
    <section id="inicio" className="relative overflow-x-clip pt-24 pb-16 sm:pt-28 sm:pb-20 lg:min-h-[38rem] xl:min-h-[44rem]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_-10%,rgba(127,29,46,0.35),transparent_50%),radial-gradient(ellipse_at_90%_20%,rgba(212,175,83,0.1),transparent_45%),radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
      </div>

      <div className="contenedor relative">
        <div className="animar-aparecer relative z-10 mx-auto max-w-xl lg:mx-0 lg:max-w-[34rem] xl:max-w-[38rem]">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-oro-400/30 bg-oro-400/5 px-4 py-1.5 text-[11px] tracking-[0.2em] text-oro-200 uppercase">
            {sitio.hero.volanta}
          </p>

          <h1 className="text-center font-display text-4xl leading-[1.12] font-semibold sm:text-6xl lg:text-left lg:text-6xl xl:text-7xl">
            <span className="block lg:whitespace-nowrap">{sitio.hero.titulo}</span>
            <span className="texto-oro block italic lg:whitespace-nowrap">{sitio.hero.tituloDestacado}</span>
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
