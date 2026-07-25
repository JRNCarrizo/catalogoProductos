import { sitio } from '../config/sitio'
import { fechaLegible } from '../lib/formato'
import { consultaGeneral } from '../lib/whatsapp'
import { IconoCopa, IconoWhatsApp } from './iconos'

interface Props {
  actualizado: string
}

export function PieDePagina({ actualizado }: Props) {
  const anio = new Date().getFullYear()

  return (
    <footer id="contacto" className="relative overflow-hidden border-t border-white/10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-40 left-1/4 size-[28rem] rounded-full bg-vino-700/25 blur-[130px]" />
        <div className="absolute right-0 bottom-0 size-[20rem] rounded-full bg-oro-500/8 blur-[100px]" />
      </div>

      <div className="contenedor pt-16 pb-8 sm:pt-20">
        {/* Bloque principal */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <a href="#inicio" className="group inline-flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full border border-oro-400/45 bg-oro-400/5 text-oro-300 transition group-hover:border-oro-300 group-hover:text-oro-200">
                <IconoCopa className="size-6" />
              </span>
              <span className="leading-tight">
                <span className="block font-display text-2xl font-semibold tracking-wide text-crema sm:text-3xl">
                  {sitio.nombre}
                </span>
                <span className="mt-0.5 block text-[11px] tracking-[0.22em] text-humo uppercase">
                  {sitio.lema}
                </span>
              </span>
            </a>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-humo">
              Catálogo actualizado con stock limitado. Armá tu pedido y lo confirmamos por WhatsApp.
            </p>

            <a
              href={consultaGeneral()}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-[#062d16] shadow-[0_10px_30px_-12px_rgba(37,211,102,0.8)] transition hover:brightness-110"
            >
              <IconoWhatsApp className="size-5" />
              {sitio.whatsappVisible}
            </a>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-display text-lg text-crema">Contacto</h3>
            <div className="mt-2 h-px w-10 bg-oro-400/50" />
            <ul className="mt-5 space-y-3 text-sm">
              <li className="text-humo">
                <span className="mb-0.5 block text-[10px] tracking-[0.18em] text-humo/70 uppercase">Ubicación</span>
                <span className="text-crema/90">{sitio.ciudad}</span>
              </li>
              <li className="text-humo">
                <span className="mb-0.5 block text-[10px] tracking-[0.18em] text-humo/70 uppercase">WhatsApp</span>
                <a
                  href={consultaGeneral()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-crema/90 transition hover:text-oro-200"
                >
                  {sitio.whatsappVisible}
                </a>
              </li>
              {sitio.email && (
                <li className="text-humo">
                  <span className="mb-0.5 block text-[10px] tracking-[0.18em] text-humo/70 uppercase">Email</span>
                  <a href={`mailto:${sitio.email}`} className="text-crema/90 transition hover:text-oro-200">
                    {sitio.email}
                  </a>
                </li>
              )}
              {sitio.instagram && (
                <li className="text-humo">
                  <span className="mb-0.5 block text-[10px] tracking-[0.18em] text-humo/70 uppercase">Redes</span>
                  <a
                    href={sitio.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-crema/90 transition hover:text-oro-200"
                  >
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Navegación */}
          <div>
            <h3 className="font-display text-lg text-crema">Navegación</h3>
            <div className="mt-2 h-px w-10 bg-oro-400/50" />
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href="#inicio" className="text-crema/90 transition hover:text-oro-200">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#catalogo" className="text-crema/90 transition hover:text-oro-200">
                  Catálogo
                </a>
              </li>
              <li>
                <a href="#contacto" className="text-crema/90 transition hover:text-oro-200">
                  Contacto
                </a>
              </li>
            </ul>
            {actualizado && (
              <p className="mt-8 max-w-[14rem] text-xs leading-relaxed text-humo">
                Precios actualizados al{' '}
                <span className="text-crema/80">{fechaLegible(actualizado)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Avisos */}
        <div className="mt-14 rounded-2xl border border-white/8 bg-noche-900/50 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 text-xs leading-relaxed text-humo sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <p>{sitio.aclaracionPrecios}</p>
            <p className="shrink-0 text-crema/70">Beber con moderación · +18</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-white/8 pt-6 text-center">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full border border-oro-400/30 text-oro-300/80">
              <IconoCopa className="size-3.5" />
            </span>
            <p className="text-xs text-humo">
              © {anio} <span className="text-crema/85">{sitio.nombre}</span>. Todos los derechos reservados.
            </p>
          </div>
          <p className="text-xs text-humo">
            Desarrollado por{' '}
            <a
              href="mailto:JRNcarrizo@gmail.com"
              className="font-medium text-oro-300/90 transition hover:text-oro-200"
            >
              JRNcarrizo@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
