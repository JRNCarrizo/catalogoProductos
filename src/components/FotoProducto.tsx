import type { Producto } from '../types'
import { recurso } from '../lib/rutas'
import { BotellaIlustrada } from './BotellaIlustrada'

interface Props {
  producto: Pick<Producto, 'imagen' | 'bodega' | 'nombre' | 'tipo' | 'variedad'>
  /** Tamaño del marco: tarjeta del catálogo o modal de detalle. */
  variante?: 'tarjeta' | 'detalle'
  className?: string
}

/** Escena de botella con un toque de luz en la base (sin sombra ni zoom al hover). */
export function FotoProducto({ producto, variante = 'tarjeta', className = '' }: Props) {
  const esDetalle = variante === 'detalle'
  const src = producto.imagen ? recurso(producto.imagen) : ''

  return (
    <div
      className={[
        'relative overflow-hidden',
        esDetalle ? 'h-96' : 'h-64 w-full',
        className,
      ].join(' ')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_48%_32%,rgba(212,175,83,0.1),rgba(127,29,46,0.08)_40%,transparent_70%)]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 z-0 h-4 w-[42%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(247,241,232,0.4),rgba(212,175,83,0.14)_45%,transparent_74%)]"
      />

      {src ? (
        <img
          src={src}
          alt={`${producto.bodega} ${producto.nombre}`}
          loading={esDetalle ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-x-0 top-4 bottom-6 z-[1] mx-auto h-auto max-h-[calc(100%-2.5rem)] w-auto max-w-[72%] object-contain object-bottom"
        />
      ) : (
        <BotellaIlustrada
          tipo={producto.tipo}
          bodega={producto.bodega}
          variedad={producto.variedad}
          className="absolute bottom-6 left-1/2 z-[1] h-[78%] -translate-x-1/2"
        />
      )}

      <div
        aria-hidden
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-10',
          esDetalle
            ? 'bg-gradient-to-t from-noche-900 to-transparent'
            : 'bg-gradient-to-t from-noche-850 to-transparent',
        ].join(' ')}
      />
    </div>
  )
}
