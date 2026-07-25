import { sitio } from '../config/sitio'
import { IconoCamion, IconoCopa, IconoEtiqueta } from './iconos'

const items = [
  {
    Icono: IconoEtiqueta,
    titulo: 'Marcas conocidas',
    detalle: 'Vinos de calidad a un precio mucho más accesible.',
  },
  {
    Icono: IconoCopa,
    titulo: 'Stock del día',
    detalle: 'El listado cambia: cuando se acaba, se acaba.',
  },
  {
    Icono: IconoCamion,
    titulo: sitio.entrega.titulo,
    detalle: sitio.entrega.detalle,
  },
]

export function Beneficios() {
  return (
    <section id="seleccion" className="border-y border-white/8 bg-noche-900/60 py-14">
      <div className="contenedor grid gap-10 sm:grid-cols-3">
        {items.map(({ Icono, titulo, detalle }) => (
          <div key={titulo} className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-oro-400/30 text-oro-300">
              <Icono className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-xl text-crema">{titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-humo">{detalle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
