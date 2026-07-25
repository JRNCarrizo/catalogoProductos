import { sitio } from '../config/sitio'
import { BotellaIlustrada } from './BotellaIlustrada'
import { IconoFlechaAbajo, IconoWhatsApp } from './iconos'
import { consultaGeneral } from '../lib/whatsapp'

interface Props {
  cantidadEtiquetas: number
  cantidadBodegas: number
}

export function Portada({ cantidadEtiquetas, cantidadBodegas }: Props) {
  return (
    <section id="inicio" className="relative overflow-x-clip pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-vino-700/35 blur-[120px]" />
        <div className="absolute top-24 -right-24 size-[26rem] rounded-full bg-oro-500/12 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
      </div>

      <div className="contenedor grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animar-aparecer">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-oro-400/30 bg-oro-400/5 px-4 py-1.5 text-[11px] tracking-[0.2em] text-oro-200 uppercase">
            {sitio.hero.volanta}
          </p>

          <h1 className="font-display text-5xl leading-[1.12] font-semibold sm:text-6xl lg:text-7xl">
            {sitio.hero.titulo}
            <br />
            <span className="texto-oro italic">{sitio.hero.tituloDestacado}</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-humo">{sitio.hero.subtitulo}</p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
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

          <dl className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <div>
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Disponibles</dt>
              <dd className="font-display text-3xl text-oro-200">{cantidadEtiquetas}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Marcas</dt>
              <dd className="font-display text-3xl text-oro-200">{cantidadBodegas}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.18em] text-humo uppercase">Pedidos</dt>
              <dd className="font-display text-2xl leading-tight text-oro-200 sm:text-3xl">WhatsApp</dd>
            </div>
          </dl>
        </div>

        <div className="relative hidden justify-center lg:flex">
          <div className="absolute bottom-8 h-24 w-72 rounded-[50%] bg-black/60 blur-3xl" />
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
      </div>
    </section>
  )
}
