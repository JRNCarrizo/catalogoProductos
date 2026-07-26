import type { Producto } from '../types'
import { precio } from '../lib/formato'
import { recurso } from '../lib/rutas'
import { consultaProducto } from '../lib/whatsapp'
import { useSuperposicion } from '../hooks/useSuperposicion'
import { BotellaIlustrada } from './BotellaIlustrada'
import { IconoCarrito, IconoCerrar, IconoWhatsApp } from './iconos'

interface Props {
  producto: Producto | null
  onCerrar: () => void
  onAgregar: (producto: Producto) => void
}

export function DetalleProducto({ producto, onCerrar, onAgregar }: Props) {
  useSuperposicion(producto !== null, onCerrar)

  if (!producto) return null

  const sinStock = producto.stock <= 0
  const enOferta = producto.precioAnterior !== null && producto.precioAnterior > producto.precio

  const datos: [string, string][] = [
    ['Bodega', producto.bodega],
    ['Variedad', producto.variedad],
    ['Cosecha', producto.anio ? String(producto.anio) : 'Sin cosecha declarada'],
    ['Región', producto.region],
    ['Volumen', `${producto.volumenMl} ml`],
    ['Alcohol', producto.graduacion ? `${producto.graduacion}% vol.` : '—'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-noche-950/85 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
        className="animar-aparecer scrollbar-fina relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/10 bg-noche-900 sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/12 bg-noche-950/70 text-humo transition hover:text-crema"
          aria-label="Cerrar"
        >
          <IconoCerrar className="size-5" />
        </button>

        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[0.85fr_1.15fr]">
          <div className="flex items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.08),transparent_65%)] p-6">
            {producto.imagen ? (
              <img
                src={recurso(producto.imagen)}
                alt={`${producto.bodega} ${producto.nombre}`}
                className="max-h-96 w-full object-contain"
              />
            ) : (
              <BotellaIlustrada
                tipo={producto.tipo}
                bodega={producto.bodega}
                variedad={producto.variedad}
                className="h-80"
              />
            )}
          </div>

          <div>
            <p className="text-[11px] tracking-[0.2em] text-oro-300 uppercase">{producto.tipo}</p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-crema">{producto.nombre}</h2>
            <p className="mt-1 text-humo">
              {producto.bodega} · {producto.region}
            </p>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              {enOferta && <span className="text-lg text-humo line-through">{precio(producto.precioAnterior!)}</span>}
              <span className="font-display text-4xl text-oro-200">{precio(producto.precio)}</span>
              {producto.precioCaja !== null && (
                <span className="text-sm text-humo">· {precio(producto.precioCaja)} c/u desde 2 unidades</span>
              )}
            </div>

            <p className="mt-6 leading-relaxed text-humo">{producto.descripcion}</p>

            {producto.notas.length > 0 && (
              <div className="mt-6">
                <p className="text-[11px] tracking-[0.2em] text-humo uppercase">En nariz y boca</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {producto.notas.map((nota) => (
                    <span
                      key={nota}
                      className="rounded-full border border-white/12 px-3 py-1 text-xs text-crema/90"
                    >
                      {nota}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {producto.maridaje && (
              <p className="mt-5 text-sm text-humo">
                <span className="text-crema">Marida con:</span> {producto.maridaje}
              </p>
            )}

            <dl className="mt-7 grid grid-cols-2 gap-y-3 border-t border-white/8 pt-6 text-sm">
              {datos.map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                  <dt className="text-[11px] tracking-[0.15em] text-humo uppercase">{etiqueta}</dt>
                  <dd className="text-crema/90">{valor}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={sinStock}
                onClick={() => onAgregar(producto)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-vino-600 px-6 py-3.5 text-sm font-semibold text-crema transition hover:bg-vino-500 disabled:cursor-not-allowed disabled:bg-noche-700 disabled:text-humo/50"
              >
                <IconoCarrito className="size-5" />
                {sinStock ? 'Sin stock' : 'Agregar al pedido'}
              </button>
              <a
                href={consultaProducto(producto)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-6 py-3.5 text-sm text-crema transition hover:border-oro-400/60 hover:text-oro-200"
              >
                <IconoWhatsApp className="size-4" />
                Consultar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
