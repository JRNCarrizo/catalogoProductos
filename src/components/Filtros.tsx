import { useLayoutEffect, useRef } from 'react'
import { IconoBuscar, IconoCerrar } from './iconos'

export type Orden = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre'

export interface EstadoFiltros {
  busqueda: string
  tipo: string
  nombre: string
  orden: Orden
  soloOfertas: boolean
}

interface Props {
  filtros: EstadoFiltros
  onCambiar: (filtros: EstadoFiltros) => void
  tipos: string[]
  nombres: string[]
  resultados: number
}

const ordenes: { valor: Orden; texto: string }[] = [
  { valor: 'destacados', texto: 'Destacados primero' },
  { valor: 'precio-asc', texto: 'Menor precio' },
  { valor: 'precio-desc', texto: 'Mayor precio' },
  { valor: 'nombre', texto: 'Nombre A-Z' },
]

const claseCampo =
  'w-full rounded-full border border-white/12 bg-noche-850 px-4 py-2.5 text-sm text-crema outline-none transition focus:border-oro-400/60'

export function Filtros({ filtros, onCambiar, tipos, nombres, resultados }: Props) {
  const barra = useRef<HTMLDivElement>(null)
  /** Posición en pantalla de la barra antes del cambio, para no perder el punto de vista. */
  const topPrevio = useRef<number | null>(null)

  const cambiar = (siguientes: EstadoFiltros) => {
    topPrevio.current = barra.current?.getBoundingClientRect().top ?? null
    onCambiar(siguientes)
  }

  const actualizar = (cambios: Partial<EstadoFiltros>) => cambiar({ ...filtros, ...cambios })

  // Al cambiar la cantidad de resultados la página cambia de alto y el navegador
  // reajusta el scroll. Devolvemos la barra al mismo lugar de la pantalla.
  useLayoutEffect(() => {
    const anterior = topPrevio.current
    topPrevio.current = null
    if (anterior == null || !barra.current) return

    const diferencia = barra.current.getBoundingClientRect().top - anterior
    if (Math.abs(diferencia) > 1) window.scrollBy({ top: diferencia, behavior: 'instant' })
  }, [filtros, resultados])

  const hayFiltros =
    filtros.busqueda !== '' || filtros.tipo !== 'todos' || filtros.nombre !== 'todos' || filtros.soloOfertas

  return (
    <div
      ref={barra}
      className="sticky top-16 z-30 -mx-5 mb-10 border-y border-white/8 bg-noche-950/85 px-5 py-4 backdrop-blur-xl sm:top-18"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative w-full lg:min-w-0 lg:flex-1">
            <IconoBuscar className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-humo" />
            <input
              type="search"
              value={filtros.busqueda}
              onChange={(evento) => actualizar({ busqueda: evento.target.value })}
              placeholder="Buscar por nombre, marca, variedad o región"
              className={`${claseCampo} pl-11`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3 lg:contents">
            <select
              value={filtros.nombre}
              onChange={(evento) => actualizar({ nombre: evento.target.value })}
              className={`${claseCampo} lg:w-52 lg:shrink-0`}
              aria-label="Filtrar por nombre"
            >
              <option value="todos">Todos los nombres</option>
              {nombres.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>

            <select
              value={filtros.orden}
              onChange={(evento) => actualizar({ orden: evento.target.value as Orden })}
              className={`${claseCampo} lg:w-52 lg:shrink-0`}
              aria-label="Ordenar"
            >
              {ordenes.map((orden) => (
                <option key={orden.valor} value={orden.valor}>
                  {orden.texto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Pastilla
            activa={filtros.tipo === 'todos'}
            onClick={() => actualizar({ tipo: 'todos' })}
            texto="Todos"
          />
          {tipos.map((tipo) => (
            <Pastilla
              key={tipo}
              activa={filtros.tipo === tipo}
              onClick={() => actualizar({ tipo })}
              texto={tipo}
            />
          ))}

          <span className="mx-1 hidden h-5 w-px bg-white/12 sm:block" />

          <Pastilla
            activa={filtros.soloOfertas}
            onClick={() => actualizar({ soloOfertas: !filtros.soloOfertas })}
            texto="En oferta"
          />

          <span className="ml-auto flex shrink-0 items-center gap-3 pl-2 text-xs text-humo">
            {resultados} {resultados === 1 ? 'producto' : 'productos'}
            {hayFiltros && (
              <button
                type="button"
                onClick={() =>
                  cambiar({ busqueda: '', tipo: 'todos', nombre: 'todos', orden: filtros.orden, soloOfertas: false })
                }
                className="inline-flex items-center gap-1 text-crema underline decoration-white/30 transition hover:text-oro-200"
              >
                <IconoCerrar className="size-3" />
                Limpiar
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

function Pastilla({
  activa,
  onClick,
  texto,
}: {
  activa: boolean
  onClick: () => void
  texto: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-wide whitespace-nowrap transition ${
        activa
          ? 'border-oro-400/70 bg-oro-400/15 text-oro-200'
          : 'border-white/12 text-humo hover:border-white/30 hover:text-crema'
      }`}
    >
      {texto}
    </button>
  )
}
