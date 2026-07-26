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
 * Escena de botella: el color de la foto se difumina en un óvalo suave
 * (sin marco cuadrado) y se disuelve hacia el fondo de la tarjeta.
 */
export function FotoProducto({ producto, variante = 'tarjeta', className = '' }: Props) {
  const esDetalle = variante === 'detalle'
  const src = producto.imagen ? recurso(producto.imagen) : ''
  const mascara = esDetalle
    ? 'radial-gradient(ellipse 72% 68% at 50% 42%, #000 18%, transparent 72%)'
    : 'radial-gradient(ellipse 78% 72% at 50% 38%, #000 12%, transparent 70%)'

  return (
    <div
      className={[
        'relative flex items-center justify-center',
        esDetalle ? 'h-96' : 'h-64 w-full',
        className,
      ].join(' ')}
    >
      {/* Aura ovalada — sin borde cuadrado */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ WebkitMaskImage: mascara, maskImage: mascara }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-3xl saturate-[0.9]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.1),transparent_65%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-vino-900/20 via-transparent to-noche-950/40" />
      </div>

      <div className="relative z-[1] flex h-full w-full items-end justify-center px-6 pb-5 pt-6">
        {src ? (
          <img
            src={src}
            alt={`${producto.bodega} ${producto.nombre}`}
            loading={esDetalle ? 'eager' : 'lazy'}
            className={[
              'h-full w-auto max-w-[72%] object-contain object-bottom',
              'drop-shadow-[0_20px_36px_rgba(0,0,0,0.7)]',
              'transition duration-500 will-change-transform group-hover:scale-[1.04] group-hover:-translate-y-0.5',
            ].join(' ')}
          />
        ) : (
          <BotellaIlustrada
            tipo={producto.tipo}
            bodega={producto.bodega}
            variedad={producto.variedad}
            className={[
              'h-full w-auto transition duration-500',
              'group-hover:scale-[1.04] group-hover:-translate-y-0.5',
            ].join(' ')}
          />
        )}
      </div>

      {/* Disolución hacia el cuerpo de la tarjeta / modal */}
      <div
        aria-hidden
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 h-20',
          esDetalle
            ? 'bg-gradient-to-t from-noche-900 via-noche-900/70 to-transparent'
            : 'bg-gradient-to-t from-noche-850 via-noche-850/75 to-transparent',
        ].join(' ')}
      />
    </div>
  )
}
