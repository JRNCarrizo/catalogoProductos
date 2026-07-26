import type { Producto } from '../types'
import { porcentajeDescuento, precio } from '../lib/formato'
import { FotoProducto } from './FotoProducto'
import { IconoCarrito } from './iconos'

interface Props {
  producto: Producto
  enCarrito: number
  onAgregar: (producto: Producto) => void
  onRestar: (producto: Producto) => void
  onVerDetalle: (producto: Producto) => void
}

export function TarjetaProducto({ producto, enCarrito, onAgregar, onRestar, onVerDetalle }: Props) {
  const sinStock = producto.stock <= 0
  const ultimasUnidades = !sinStock && producto.stock <= 6
  const enOferta = producto.precioAnterior !== null && producto.precioAnterior > producto.precio

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-noche-850 to-noche-900 transition duration-300 [content-visibility:auto] [contain-intrinsic-size:auto_30rem] hover:-translate-y-1 hover:border-oro-400/30 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]">
      <button
        type="button"
        onClick={() => onVerDetalle(producto)}
        className="relative block w-full overflow-hidden"
        aria-label={`Ver detalle de ${producto.nombre}`}
      >
        <FotoProducto producto={producto} variante="tarjeta" />

        <div className="absolute top-4 left-4 z-[2] flex flex-col items-start gap-2">
          {enOferta && (
            <span className="rounded-full bg-vino-600 px-2.5 py-1 text-[11px] font-semibold text-crema">
              -{porcentajeDescuento(producto.precio, producto.precioAnterior!)}%
            </span>
          )}
          {producto.destacado && !enOferta && (
            <span className="rounded-full border border-oro-400/50 bg-noche-950/70 px-2.5 py-1 text-[11px] tracking-wider text-oro-200 uppercase">
              Destacado
            </span>
          )}
        </div>

        {sinStock && (
          <span className="absolute inset-x-4 top-1/2 z-[2] -translate-y-1/2 rounded-md bg-noche-950/85 py-2 text-center text-xs tracking-[0.2em] text-humo uppercase">
            Sin stock
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-5 pt-4">
        <p className="text-[11px] tracking-[0.18em] text-humo uppercase">{producto.bodega}</p>

        <h3 className="mt-1.5 font-display text-2xl leading-snug text-crema">
          <button type="button" onClick={() => onVerDetalle(producto)} className="text-left hover:text-oro-200">
            {producto.nombre}
          </button>
        </h3>

        <p className="mt-1 text-sm leading-snug text-humo">
          <span className="font-display text-xl text-oro-200">{producto.variedad}</span>
          {producto.anio ? ` · ${producto.anio}` : ''} · {producto.volumenMl} ml
        </p>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-humo/85">{producto.descripcion}</p>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/8 pt-4">
          <div>
            {enOferta && (
              <span className="mr-2 text-sm text-humo line-through">{precio(producto.precioAnterior!)}</span>
            )}
            <span className="font-display text-3xl text-oro-200">{precio(producto.precio)}</span>
            {producto.precioCaja !== null && (
              <span className="mt-1 block text-[11px] text-humo">
                {precio(producto.precioCaja)} c/u desde 2 unidades
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {enCarrito > 0 && (
              <button
                type="button"
                onClick={() => onRestar(producto)}
                className="flex size-11 items-center justify-center rounded-full border border-white/15 bg-noche-850 text-lg text-crema transition hover:border-oro-400/40 hover:bg-noche-800"
                aria-label={`Quitar una unidad de ${producto.nombre}`}
              >
                −
              </button>
            )}
            <button
              type="button"
              disabled={sinStock}
              onClick={() => onAgregar(producto)}
              className="flex size-11 items-center justify-center rounded-full bg-vino-600 text-crema transition hover:bg-vino-500 disabled:cursor-not-allowed disabled:bg-noche-700 disabled:text-humo/50"
              aria-label={`Agregar ${producto.nombre} al pedido`}
            >
              {enCarrito > 0 ? <span className="text-sm font-semibold">{enCarrito}</span> : <IconoCarrito className="size-5" />}
            </button>
          </div>
        </div>

        {ultimasUnidades && (
          <p className="mt-3 text-[11px] tracking-wide text-oro-300">Últimas {producto.stock} botellas</p>
        )}
      </div>
    </article>
  )
}
