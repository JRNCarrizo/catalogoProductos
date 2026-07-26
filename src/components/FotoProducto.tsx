import type { Producto } from '../types'
import { recurso } from '../lib/rutas'
import { BotellaIlustrada } from './BotellaIlustrada'

interface Props {
  producto: Pick<Producto, 'imagen' | 'bodega' | 'nombre' | 'tipo' | 'variedad'>
  /** Tamaño del marco: tarjeta del catálogo o modal de detalle. */
  variante?: 'tarjeta' | 'detalle'
  className?: string
}

/**
 * Escena de botella con aura y sombra hechas solo con degradados.
 * Sin filtros (blur/drop-shadow) ni máscaras: en el catálogo hay decenas
 * de tarjetas y en celulares eso agota la memoria de la GPU.
 */
export function FotoProducto({ producto, variante = 'tarjeta', className = '' }: Props) {
  const esDetalle = variante === 'detalle'
  const src = producto.imagen ? recurso(producto.imagen) : ''

  return (
    <div
      className={[
        'relative flex items-center justify-center',
        esDetalle ? 'h-96' : 'h-64 w-full',
        className,
      ].join(' ')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_58%_at_50%_36%,rgba(212,175,83,0.13),rgba(127,29,46,0.12)_38%,transparent_72%)]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[24%] bottom-[8%] h-8 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(0,0,0,0.55),transparent_72%)]"
      />

      <div className="relative z-[1] flex h-full w-full items-end justify-center px-6 pb-5 pt-6">
        {src ? (
          <img
            src={src}
            alt={`${producto.bodega} ${producto.nombre}`}
            loading={esDetalle ? 'eager' : 'lazy'}
            decoding="async"
            className={[
              'h-full w-auto max-w-[72%] object-contain object-bottom',
              'transition-transform duration-500 group-hover:scale-[1.04]',
            ].join(' ')}
          />
        ) : (
          <BotellaIlustrada
            tipo={producto.tipo}
            bodega={producto.bodega}
            variedad={producto.variedad}
            className="h-full w-auto transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
      </div>

      <div
        aria-hidden
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 h-16',
          esDetalle
            ? 'bg-gradient-to-t from-noche-900 to-transparent'
            : 'bg-gradient-to-t from-noche-850 to-transparent',
        ].join(' ')}
      />
    </div>
  )
}
