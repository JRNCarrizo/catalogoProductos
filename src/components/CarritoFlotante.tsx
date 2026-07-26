import type { ItemCarrito } from '../types'
import { precio } from '../lib/formato'
import { IconoCarrito } from './iconos'

interface Props {
  items: ItemCarrito[]
  unidades: number
  total: number
  onAbrir: () => void
}

export function CarritoFlotante({ items, unidades, total, onAbrir }: Props) {
  if (unidades === 0) return null

  const ultimo = items[items.length - 1]?.producto

  return (
    <div className="fixed right-4 bottom-4 z-30 sm:right-6 sm:bottom-6">
      <button
        type="button"
        onClick={onAbrir}
        className="group flex items-center gap-3 rounded-2xl border border-oro-400/30 bg-noche-850 py-2.5 pr-3 pl-2.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)] transition hover:border-oro-400/60"
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-vino-600 text-crema transition group-hover:bg-vino-500">
          <IconoCarrito className="size-6" />
          <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-oro-400 px-1 text-[11px] font-semibold text-noche-950">
            {unidades}
          </span>
        </span>

        <span className="pr-1 text-left">
          <span className="block text-[10px] tracking-[0.16em] text-humo uppercase">Mi pedido</span>
          <span className="block font-display text-xl leading-tight text-oro-200">{precio(total)}</span>
          {ultimo && (
            <span className="hidden max-w-[10rem] truncate text-[11px] text-humo sm:block">
              + {ultimo.nombre}
            </span>
          )}
        </span>

        <span className="ml-1 hidden rounded-full bg-crema px-4 py-2 text-xs font-semibold text-noche-950 transition group-hover:bg-oro-200 sm:block">
          Ver pedido
        </span>
      </button>
    </div>
  )
}
