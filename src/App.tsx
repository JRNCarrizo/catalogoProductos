import { useMemo, useState } from 'react'
import type { Producto } from './types'
import { useCatalogo } from './hooks/useCatalogo'
import { useCarrito } from './hooks/useCarrito'
import { useSitio } from './hooks/useSitio'
import { Encabezado } from './components/Encabezado'
import { Portada } from './components/Portada'
import { Beneficios } from './components/Beneficios'
import { Filtros, type EstadoFiltros } from './components/Filtros'
import { TarjetaProducto } from './components/TarjetaProducto'
import { DetalleProducto } from './components/DetalleProducto'
import { PanelPedido } from './components/PanelPedido'
import { CarritoFlotante } from './components/CarritoFlotante'
import { PieDePagina } from './components/PieDePagina'
import { IconoWhatsApp } from './components/iconos'

const filtrosIniciales: EstadoFiltros = {
  busqueda: '',
  tipo: 'todos',
  nombre: 'todos',
  orden: 'destacados',
  soloOfertas: false,
}

export default function App() {
  const sitio = useSitio()
  const { cargando, error, catalogo } = useCatalogo()
  const productos = catalogo?.productos ?? []
  /** Solo los publicados: inactivos quedan en el JSON para panel/APK, no en la web. */
  const publicados = useMemo(
    () => productos.filter((producto) => producto.activo !== false),
    [productos],
  )

  const [filtros, setFiltros] = useState<EstadoFiltros>(filtrosIniciales)
  const [detalle, setDetalle] = useState<Producto | null>(null)
  const [pedidoAbierto, setPedidoAbierto] = useState(false)

  const carrito = useCarrito(productos)

  const tipos = useMemo(
    () => [...new Set(publicados.map((producto) => producto.tipo))],
    [publicados],
  )
  const bodegas = useMemo(
    () => [...new Set(publicados.map((producto) => producto.bodega))].sort((a, b) => a.localeCompare(b, 'es')),
    [publicados],
  )
  const nombres = useMemo(
    () =>
      [...new Set(publicados.map((producto) => producto.nombre).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [publicados],
  )

  const visibles = useMemo(() => {
    const termino = filtros.busqueda.trim().toLowerCase()

    const filtrados = publicados.filter((producto) => {
      if (filtros.tipo !== 'todos' && producto.tipo !== filtros.tipo) return false
      if (filtros.nombre !== 'todos' && producto.nombre !== filtros.nombre) return false
      if (filtros.soloOfertas && !(producto.precioAnterior && producto.precioAnterior > producto.precio)) {
        return false
      }
      if (!termino) return true

      return [producto.nombre, producto.bodega, producto.variedad, producto.region, producto.tipo]
        .join(' ')
        .toLowerCase()
        .includes(termino)
    })

    return filtrados.sort((a, b) => {
      switch (filtros.orden) {
        case 'precio-asc':
          return a.precio - b.precio
        case 'precio-desc':
          return b.precio - a.precio
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es')
        default:
          if (a.destacado !== b.destacado) return a.destacado ? -1 : 1
          return b.precio - a.precio
      }
    })
  }, [publicados, filtros])

  const agregar = (producto: Producto) => {
    carrito.agregar(producto)
  }

  const restar = (producto: Producto) => {
    const actual = carrito.cantidades.get(producto.id) ?? 0
    carrito.definirCantidad(producto, actual - 1)
  }

  return (
    <>
      <Encabezado unidades={carrito.unidades} onAbrirCarrito={() => setPedidoAbierto(true)} />

      <main>
        <Portada cantidadEtiquetas={publicados.length} cantidadBodegas={bodegas.length} />
        <Beneficios />

        <section className="contenedor py-16">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] tracking-[0.2em] text-oro-300 uppercase">Catálogo</p>
            <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Elegí y pedí</h2>
            <p className="mt-4 text-humo">Sumá botellas al pedido y envialo por WhatsApp.</p>
          </div>

          {/* El alto mínimo evita que la página se acorte al filtrar y salte el scroll. */}
          <div id="catalogo" className="min-h-[85vh] scroll-mt-20 sm:scroll-mt-24">
            <Filtros
              filtros={filtros}
              onCambiar={setFiltros}
              tipos={tipos}
              nombres={nombres}
              resultados={visibles.length}
            />

            {cargando && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, indice) => (
                  <div
                    key={indice}
                    className="h-[30rem] animate-pulse rounded-2xl border border-white/8 bg-noche-850"
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-vino-600/40 bg-vino-900/20 p-8 text-center">
                <p className="font-display text-2xl text-crema">{error}</p>
                <p className="mt-2 text-sm text-humo">
                  Probá recargar la página. Si sigue igual, escribinos por WhatsApp y te pasamos la lista.
                </p>
              </div>
            )}

            {!cargando && !error && visibles.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-noche-850 p-12 text-center">
                <p className="font-display text-2xl text-crema">No encontramos vinos con ese criterio</p>
                <p className="mt-2 text-sm text-humo">Probá quitar algún filtro o buscar por variedad.</p>
                <button
                  type="button"
                  onClick={() => setFiltros(filtrosIniciales)}
                  className="mt-6 rounded-full border border-white/18 px-6 py-2.5 text-sm text-crema transition hover:border-oro-400/60 hover:text-oro-200"
                >
                  Ver todo el catálogo
                </button>
              </div>
            )}

            {visibles.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibles.map((producto) => (
                  <TarjetaProducto
                    key={producto.id}
                    producto={producto}
                    enCarrito={carrito.cantidades.get(producto.id) ?? 0}
                    onAgregar={agregar}
                    onRestar={restar}
                    onVerDetalle={setDetalle}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PieDePagina actualizado={catalogo?.actualizado ?? ''} />

      <DetalleProducto producto={detalle} onCerrar={() => setDetalle(null)} onAgregar={agregar} />

      <PanelPedido
        abierto={pedidoAbierto}
        items={carrito.items}
        total={carrito.total}
        catalogo={productos}
        onCerrar={() => setPedidoAbierto(false)}
        onDefinirCantidad={carrito.definirCantidad}
        onQuitar={carrito.quitar}
        onVaciar={carrito.vaciar}
      />

      <CarritoFlotante
        items={carrito.items}
        unidades={carrito.unidades}
        total={carrito.total}
        onAbrir={() => setPedidoAbierto(true)}
      />

      <a
        href={`https://wa.me/${sitio.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribinos por WhatsApp"
        className="fixed bottom-4 left-4 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-[#062d16] shadow-[0_12px_30px_-8px_rgba(0,0,0,0.8)] transition hover:brightness-110 sm:bottom-6 sm:left-6"
      >
        <IconoWhatsApp className="size-7" />
      </a>
    </>
  )
}
