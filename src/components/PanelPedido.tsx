import type { ItemCarrito, Producto } from '../types'
import { precio, aplicaPromoCantidad, precioUnitario, subtotalLinea } from '../lib/formato'
import { recurso } from '../lib/rutas'
import { pedido } from '../lib/whatsapp'
import { sitio } from '../config/sitio'
import { useSuperposicion } from '../hooks/useSuperposicion'
import { BotellaIlustrada } from './BotellaIlustrada'
import { IconoCerrar, IconoWhatsApp } from './iconos'

interface Props {
  abierto: boolean
  items: ItemCarrito[]
  total: number
  catalogo: Producto[]
  onCerrar: () => void
  onDefinirCantidad: (producto: Producto, cantidad: number) => void
  onQuitar: (id: string) => void
  onVaciar: () => void
}

export function PanelPedido({
  abierto,
  items,
  total,
  catalogo,
  onCerrar,
  onDefinirCantidad,
  onQuitar,
  onVaciar,
}: Props) {
  useSuperposicion(abierto, onCerrar)

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar pedido"
        className="absolute inset-0 bg-noche-950/80 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mi pedido"
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-noche-900"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="font-display text-2xl text-crema">Mi pedido</h2>
            <p className="text-xs text-humo">
              {items.length} {items.length === 1 ? 'producto' : 'productos'} · WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex size-10 items-center justify-center rounded-full border border-white/12 text-humo transition hover:text-crema"
            aria-label="Cerrar"
          >
            <IconoCerrar className="size-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <BotellaIlustrada tipo="Tinto" bodega="Tu pedido" variedad="" className="h-40 opacity-40" />
            <p className="text-humo">Todavía no agregaste botellas.</p>
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-full border border-white/18 px-6 py-2.5 text-sm text-crema transition hover:border-oro-400/60 hover:text-oro-200"
            >
              Seguir mirando el catálogo
            </button>
          </div>
        ) : (
          <>
            <ul className="scrollbar-fina min-h-0 flex-1 divide-y divide-white/8 overflow-y-auto px-5">
              {items.map(({ producto, cantidad }) => (
                <li key={producto.id} className="flex gap-3 py-3.5">
                  <div className="relative flex size-16 shrink-0 items-end justify-center overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)]">
                    {producto.imagen ? (
                      <img
                        src={recurso(producto.imagen)}
                        alt=""
                        className="max-h-[90%] max-w-[78%] object-contain object-bottom pb-1 drop-shadow-md"
                      />
                    ) : (
                      <BotellaIlustrada
                        tipo={producto.tipo}
                        bodega={producto.bodega}
                        variedad={producto.variedad}
                        className="mb-1 h-14"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base leading-tight text-crema">{producto.nombre}</p>
                        <p className="truncate text-xs text-humo">
                          {producto.bodega}
                          {producto.anio ? ` · ${producto.anio}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onQuitar(producto.id)}
                        className="mt-0.5 shrink-0 text-humo/50 transition hover:text-vino-400"
                        aria-label={`Quitar ${producto.nombre}`}
                      >
                        <IconoCerrar className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-full border border-white/12">
                        <button
                          type="button"
                          onClick={() => onDefinirCantidad(producto, cantidad - 1)}
                          className="flex size-7 items-center justify-center text-humo transition hover:text-crema"
                          aria-label="Quitar una unidad"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm text-crema">{cantidad}</span>
                        <button
                          type="button"
                          onClick={() => onDefinirCantidad(producto, cantidad + 1)}
                          disabled={cantidad >= producto.stock}
                          className="flex size-7 items-center justify-center text-humo transition hover:text-crema disabled:opacity-30"
                          aria-label="Agregar una unidad"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        {aplicaPromoCantidad(producto, cantidad) && (
                          <p className="text-[10px] text-humo">{precio(precioUnitario(producto, cantidad))} c/u</p>
                        )}
                        <span className="text-sm font-medium text-oro-200">
                          {precio(subtotalLinea(producto, cantidad))}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="shrink-0 border-t border-white/8 px-5 pt-4 pb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-humo">Total</span>
                <span className="font-display text-3xl text-oro-200">{precio(total)}</span>
              </div>

              <a
                href={pedido(items, total, catalogo)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-[#062d16] transition hover:brightness-110"
              >
                <IconoWhatsApp className="size-5" />
                Enviar por WhatsApp
              </a>

              <div className="mt-2.5 flex items-center justify-between gap-3 text-humo">
                <button
                  type="button"
                  onClick={onVaciar}
                  className="rounded-full border border-white/15 px-4 py-2.5 text-sm text-crema/90 transition hover:border-oro-400/40 hover:text-oro-200"
                >
                  Vaciar
                </button>
                <span className="truncate text-right text-[11px]">{sitio.aclaracionPrecios}</span>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
