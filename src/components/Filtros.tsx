import { IconoBuscar, IconoCerrar } from './iconos'

export type Orden = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre'

export interface EstadoFiltros {
  busqueda: string
  tipo: string
  bodega: string
  orden: Orden
  soloOfertas: boolean
}

interface Props {
  filtros: EstadoFiltros
  onCambiar: (filtros: EstadoFiltros) => void
  tipos: string[]
  bodegas: string[]
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

export function Filtros({ filtros, onCambiar, tipos, bodegas, resultados }: Props) {
  const actualizar = (cambios: Partial<EstadoFiltros>) => onCambiar({ ...filtros, ...cambios })
  const hayFiltros =
    filtros.busqueda !== '' || filtros.tipo !== 'todos' || filtros.bodega !== 'todas' || filtros.soloOfertas

  return (
    <div className="sticky top-16 z-30 -mx-5 mb-10 border-y border-white/8 bg-noche-950/85 px-5 py-4 backdrop-blur-xl sm:top-18">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <IconoBuscar className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-humo" />
            <input
              type="search"
              value={filtros.busqueda}
              onChange={(evento) => actualizar({ busqueda: evento.target.value })}
              placeholder="Buscar por nombre, bodega, variedad o región"
              className={`${claseCampo} pl-11`}
            />
          </label>

          <select
            value={filtros.bodega}
            onChange={(evento) => actualizar({ bodega: evento.target.value })}
            className={`${claseCampo} sm:w-52`}
          >
            <option value="todas">Todas las bodegas</option>
            {bodegas.map((bodega) => (
              <option key={bodega} value={bodega}>
                {bodega}
              </option>
            ))}
          </select>

          <select
            value={filtros.orden}
            onChange={(evento) => actualizar({ orden: evento.target.value as Orden })}
            className={`${claseCampo} sm:w-52`}
          >
            {ordenes.map((orden) => (
              <option key={orden.valor} value={orden.valor}>
                {orden.texto}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <span className="ml-auto flex items-center gap-3 text-xs text-humo">
            {resultados} {resultados === 1 ? 'botella' : 'botellas'}
            {hayFiltros && (
              <button
                type="button"
                onClick={() =>
                  onCambiar({ busqueda: '', tipo: 'todos', bodega: 'todas', orden: filtros.orden, soloOfertas: false })
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
      className={`rounded-full border px-4 py-1.5 text-xs tracking-wide transition ${
        activa
          ? 'border-oro-400/70 bg-oro-400/15 text-oro-200'
          : 'border-white/12 text-humo hover:border-white/30 hover:text-crema'
      }`}
    >
      {texto}
    </button>
  )
}
