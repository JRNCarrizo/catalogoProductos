import { useCallback, useEffect, useMemo, useState } from 'react'
import { escanearCodigo } from './escaner'
import {
  enviarPedidoAPc,
  enviarPedidosLocalesAPc,
  guardarCatalogo,
  guardarClaveNube,
  guardarIpPc,
  guardarPedidoLocal,
  importarCatalogoRemoto,
  leerCambios,
  leerCatalogo,
  leerClaveNube,
  leerIpPc,
  leerPedidosLocales,
  parsearHostSync,
  probarPc,
  publicarEnNube,
  registrarCambio,
  sincronizarConPc,
  type PedidoLocalPendiente,
} from './storage'
import {
  aplicarSugerencia,
  sugerirDesdeCodigoBarras,
  sugerirDesdePanel,
} from './sugerencias'
import { etiquetaProducto, parsearPedido, armarPedidoDesdeLineas, subtotalLinea, type PedidoResuelto } from './pedidoCodigo'
import { compartirCatalogoPdf } from './catalogoPdf'
import {
  CATALOGO_ONLINE,
  TIPOS,
  buscarPorCodigo,
  generarId,
  estaActivo,
  precio,
  productoVacio,
  type Catalogo,
  type Producto,
} from './types'
import './index.css'

function CopaLogo() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M10 7h12l-1 8.2A5.2 5.2 0 0 1 16 20a5.2 5.2 0 0 1-5-4.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16 20v5M12.5 25h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

type Pantalla =
  | { tipo: 'lista' }
  | { tipo: 'editor'; producto: Producto; esNuevo: boolean }
  | { tipo: 'coincidencias'; codigo: string; coincidencias: Producto[] }
  | { tipo: 'sync' }
  | { tipo: 'pedido' }

export default function App() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [pendientes, setPendientes] = useState(0)
  const [pedidosLocales, setPedidosLocales] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'lista' })
  const [aviso, setAviso] = useState<{ texto: string; tipo?: 'ok' | 'error' } | null>(null)
  const [cargando, setCargando] = useState(true)

  const refrescar = useCallback(async () => {
    const [datos, cambios, pedidos] = await Promise.all([
      leerCatalogo(),
      leerCambios(),
      leerPedidosLocales(),
    ])
    setCatalogo(datos)
    setPendientes(cambios.length)
    setPedidosLocales(pedidos.length)
  }, [])

  useEffect(() => {
    refrescar()
      .catch(() => setAviso({ texto: 'No se pudo leer el catálogo local.', tipo: 'error' }))
      .finally(() => setCargando(false))
  }, [refrescar])

  const productos = catalogo?.productos ?? []

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return productos
      .filter((producto) =>
        [producto.nombre, producto.bodega, producto.variedad, producto.codigoBarras, producto.anio]
          .join(' ')
          .toLowerCase()
          .includes(termino),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda])

  const persistir = async (siguiente: Catalogo) => {
    const guardado = await guardarCatalogo(siguiente)
    setCatalogo(guardado)
    setPendientes((await leerCambios()).length)
  }

  const ajustarStock = async (id: string, delta: number) => {
    if (!catalogo) return
    const productosNuevos = catalogo.productos.map((producto) => {
      if (producto.id !== id) return producto
      return { ...producto, stock: Math.max(0, (Number(producto.stock) || 0) + delta) }
    })
    const actualizado = productosNuevos.find((producto) => producto.id === id) ?? null
    await registrarCambio('edicion', actualizado, id)
    await persistir({ ...catalogo, productos: productosNuevos })
  }

  const guardarProducto = async (producto: Producto, esNuevo: boolean) => {
    if (!catalogo) return
    if (!producto.nombre.trim()) {
      setAviso({ texto: 'El nombre es obligatorio.', tipo: 'error' })
      return
    }

    const ids = new Set(catalogo.productos.map((item) => item.id))
    const final = { ...producto }
    if (!final.id || final.id.startsWith('tmp-')) {
      final.id = generarId(final, ids)
    }

    const productosNuevos = esNuevo
      ? [final, ...catalogo.productos.filter((item) => item.id !== final.id)]
      : catalogo.productos.map((item) => (item.id === final.id ? final : item))

    await registrarCambio(esNuevo ? 'alta' : 'edicion', final, final.id)
    await persistir({ ...catalogo, productos: productosNuevos })
    setAviso({ texto: esNuevo ? 'Producto creado.' : 'Producto actualizado.', tipo: 'ok' })
    setPantalla({ tipo: 'lista' })
  }

  const eliminarProducto = async (id: string) => {
    if (!catalogo) return
    if (!confirm('¿Eliminar este producto del colector?')) return
    await registrarCambio('baja', null, id)
    await persistir({
      ...catalogo,
      productos: catalogo.productos.filter((producto) => producto.id !== id),
    })
    setPantalla({ tipo: 'lista' })
  }

  const nuevaCosecha = (base: Producto) => {
    setPantalla({
      tipo: 'editor',
      esNuevo: true,
      producto: productoVacio({
        id: `tmp-${Date.now()}`,
        nombre: base.nombre,
        bodega: base.bodega,
        tipo: base.tipo,
        variedad: base.variedad,
        region: base.region,
        codigoBarras: base.codigoBarras,
        imagen: base.imagen,
        descripcion: base.descripcion,
        notas: [...(base.notas || [])],
        maridaje: base.maridaje,
        volumenMl: base.volumenMl,
        anio: null,
        precio: base.precio,
        precioAnterior: base.precioAnterior,
        stock: 0,
      }),
    })
  }

  const alEscanear = async () => {
    try {
      setAviso(null)
      const codigo = await escanearCodigo((texto) => setAviso({ texto }))
      if (!codigo) return

      const coincidencias = buscarPorCodigo(productos, codigo)
      if (coincidencias.length === 0) {
        setPantalla({
          tipo: 'editor',
          esNuevo: true,
          producto: productoVacio({ id: `tmp-${Date.now()}`, codigoBarras: codigo, stock: 1 }),
        })
        return
      }
      if (coincidencias.length === 1) {
        setPantalla({ tipo: 'editor', esNuevo: false, producto: { ...coincidencias[0] } })
        return
      }
      setPantalla({ tipo: 'coincidencias', codigo, coincidencias })
    } catch (error) {
      setAviso({
        texto: error instanceof Error ? error.message : 'No se pudo escanear.',
        tipo: 'error',
      })
    }
  }

  const importarOnline = async () => {
    if (
      productos.length > 0 &&
      !confirm('Esto reemplaza el catálogo local por el de la web. ¿Continuar?')
    ) {
      return
    }
    try {
      setAviso({ texto: 'Descargando catálogo…' })
      const datos = await importarCatalogoRemoto(CATALOGO_ONLINE)
      setCatalogo(datos)
      setPendientes(0)
      setAviso({ texto: `Importados ${datos.productos.length} productos.`, tipo: 'ok' })
    } catch {
      setAviso({ texto: 'No se pudo importar. ¿Tenés internet?', tipo: 'error' })
    }
  }

  const exportarPdf = async () => {
    try {
      setAviso({ texto: 'Armando PDF…' })
      const r = await compartirCatalogoPdf(productos)
      setAviso({ texto: `PDF listo · ${r.cantidad} productos con stock`, tipo: 'ok' })
    } catch (error) {
      setAviso({
        texto: error instanceof Error ? error.message : 'No se pudo generar el PDF',
        tipo: 'error',
      })
    }
  }

  if (cargando || !catalogo) {
    return (
      <div className="app">
        <div className="contenido vacio">Cargando colector…</div>
      </div>
    )
  }

  if (pantalla.tipo === 'editor') {
    return (
      <Editor
        producto={pantalla.producto}
        esNuevo={pantalla.esNuevo}
        onVolver={() => setPantalla({ tipo: 'lista' })}
        onGuardar={guardarProducto}
        onEliminar={eliminarProducto}
      />
    )
  }

  if (pantalla.tipo === 'coincidencias') {
    return (
      <div className="app">
        <header className="barra">
          <div>
            <h1>Varias cosechas</h1>
            <small>Código {pantalla.codigo}</small>
          </div>
          <button type="button" className="boton fantasma" onClick={() => setPantalla({ tipo: 'lista' })}>
            Cerrar
          </button>
        </header>
        <main className="contenido">
          <p className="aviso">Elegí la cosecha o creá una nueva a partir de este vino.</p>
          {pantalla.coincidencias.map((producto) => (
            <button
              key={producto.id}
              type="button"
              className="opcion-cosecha"
              onClick={() => setPantalla({ tipo: 'editor', esNuevo: false, producto: { ...producto } })}
            >
              <strong>
                {producto.nombre} {producto.anio ?? ''}
              </strong>
              <small>
                {producto.variedad} · {precio(producto.precio)} · stock {producto.stock}
              </small>
            </button>
          ))}
          <button
            type="button"
            className="boton bloque oro"
            onClick={() => nuevaCosecha(pantalla.coincidencias[0])}
          >
            + Nueva cosecha de este vino
          </button>
        </main>
      </div>
    )
  }

  if (pantalla.tipo === 'sync') {
    return (
      <PantallaSync
        pendientes={pendientes}
        onVolver={() => setPantalla({ tipo: 'lista' })}
        onOk={async (mensaje) => {
          await refrescar()
          setAviso({ texto: mensaje, tipo: 'ok' })
          setPantalla({ tipo: 'lista' })
        }}
        onError={(mensaje) => setAviso({ texto: mensaje, tipo: 'error' })}
      />
    )
  }

  if (pantalla.tipo === 'pedido') {
    return (
      <PantallaPedido
        productos={productos}
        onVolver={() => {
          void refrescar()
          setPantalla({ tipo: 'lista' })
        }}
        onOk={async (mensaje) => {
          await refrescar()
          setAviso({ texto: mensaje, tipo: 'ok' })
          setPantalla({ tipo: 'lista' })
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="barra barra-home">
        <div className="barra-marca">
          <span className="marca-logo" aria-hidden="true">
            <CopaLogo />
          </span>
          <div className="marca-texto">
            <h1>Vinos Colector</h1>
            <div className="marca-chips">
              <span className="chip">{productos.length} productos</span>
              <span className={`chip ${pendientes > 0 ? 'chip-alerta' : 'chip-ok'}`}>
                {pendientes > 0 ? `${pendientes} sin sincronizar` : 'sincronizado'}
              </span>
              {pedidosLocales > 0 && (
                <span className="chip chip-oro">
                  {pedidosLocales} pedido{pedidosLocales === 1 ? '' : 's'} por enviar
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="acciones-barra">
          <button
            type="button"
            className="accion"
            onClick={() => setPantalla({ tipo: 'pedido' })}
          >
            <span className="accion-icono" aria-hidden="true">🧾</span>
            <span className="accion-texto">Pedido</span>
            {pedidosLocales > 0 && <span className="accion-badge">{pedidosLocales}</span>}
          </button>
          <button type="button" className="accion" onClick={() => setPantalla({ tipo: 'sync' })}>
            <span className="accion-icono" aria-hidden="true">☁</span>
            <span className="accion-texto">Publicar</span>
          </button>
          <button
            type="button"
            className="accion"
            onClick={() => void exportarPdf()}
            title="PDF del catálogo con stock"
          >
            <span className="accion-icono" aria-hidden="true">📄</span>
            <span className="accion-texto">PDF</span>
          </button>
          <button
            type="button"
            className="accion"
            onClick={importarOnline}
            title="Traer catálogo de la web"
          >
            <span className="accion-icono" aria-hidden="true">↓</span>
            <span className="accion-texto">Web</span>
          </button>
        </div>
      </header>

      <main className="contenido">
        {aviso && <p className={`aviso ${aviso.tipo ?? ''}`}>{aviso.texto}</p>}

        <input
          className="buscador"
          type="search"
          placeholder="Buscar por nombre, bodega o código…"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />

        {visibles.length === 0 ? (
          <div className="vacio">
            <p>No hay productos todavía.</p>
            <p>Importá desde la web o creá el primero.</p>
          </div>
        ) : (
          <div className="lista">
            {visibles.map((producto) => (
              <article
                key={producto.id}
                className={`tarjeta${estaActivo(producto) ? '' : ' oculto-web'}`}
              >
                <button
                  type="button"
                  className="info"
                  style={{ background: 'transparent', border: 0, color: 'inherit', textAlign: 'left', padding: 0 }}
                  onClick={() => setPantalla({ tipo: 'editor', esNuevo: false, producto: { ...producto } })}
                >
                  <p className="nombre">
                    {producto.nombre}
                    {!estaActivo(producto) && <span className="marca-oculto">oculto</span>}
                  </p>
                  <p className="meta">
                    {[producto.variedad, producto.anio, precio(producto.precio)].filter(Boolean).join(' · ')}
                    {producto.codigoBarras ? ` · ${producto.codigoBarras}` : ''}
                  </p>
                </button>
                <div className="stock">
                  <button type="button" onClick={() => ajustarStock(producto.id, -1)} aria-label="Bajar stock">
                    −
                  </button>
                  <span>{producto.stock}</span>
                  <button type="button" onClick={() => ajustarStock(producto.id, 1)} aria-label="Subir stock">
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <div className="flotantes">
        <button type="button" className="boton bloque" onClick={alEscanear}>
          Escanear
        </button>
        <button
          type="button"
          className="boton bloque primario"
          onClick={() =>
            setPantalla({
              tipo: 'editor',
              esNuevo: true,
              producto: productoVacio({ id: `tmp-${Date.now()}`, stock: 1 }),
            })
          }
        >
          + Nuevo
        </button>
      </div>
    </div>
  )
}

function PantallaSync({
  pendientes,
  onVolver,
  onOk,
  onError,
}: {
  pendientes: number
  onVolver: () => void
  onOk: (mensaje: string) => Promise<void>
  onError: (mensaje: string) => void
}) {
  const [ip, setIp] = useState('')
  const [guardada, setGuardada] = useState('')
  const [clave, setClave] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [estado, setEstado] = useState<string | null>(null)

  useEffect(() => {
    void leerIpPc().then((valor) => {
      setIp(valor)
      setGuardada(valor)
    })
    void leerClaveNube().then(setClave)
  }, [])

  const aplicarHost = async (entrada: string, persistir = true) => {
    const host = parsearHostSync(entrada)
    if (!host) {
      onError('No reconocí una IP válida.')
      return null
    }
    setIp(host)
    if (persistir) {
      await guardarIpPc(host)
      setGuardada(host)
    }
    return host
  }

  const escanearQrPc = async () => {
    setTrabajando(true)
    setEstado(null)
    try {
      const leido = await escanearCodigo((texto) => setEstado(texto))
      if (!leido) return
      const host = await aplicarHost(leido, true)
      if (host) setEstado(`PC guardada: ${host}`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo escanear el QR')
    } finally {
      setTrabajando(false)
    }
  }

  const guardarConfig = async () => {
    const host = await aplicarHost(ip, true)
    if (host) setEstado(`IP guardada. La próxima vez ya queda lista.`)
  }

  const probar = async () => {
    setTrabajando(true)
    setEstado(null)
    try {
      const host = await aplicarHost(ip, true)
      if (!host) return
      const r = await probarPc(host)
      setEstado(`Conectado a ${r.servicio} · ${r.productos} productos en la PC`)
    } catch {
      setEstado(null)
      onError('No se pudo conectar. ¿El panel está abierto y están en la misma WiFi?')
    } finally {
      setTrabajando(false)
    }
  }

  const enviar = async (reemplazarTodo = false) => {
    setTrabajando(true)
    setEstado(null)
    try {
      const host = await aplicarHost(ip, true)
      if (!host) return
      const r = await sincronizarConPc({ host, reemplazarTodo })
      const pedidos = await enviarPedidosLocalesAPc(host)
      const extra =
        pedidos.enviados + pedidos.yaEstaban > 0
          ? ` · ${pedidos.enviados + pedidos.yaEstaban} pedido(s) enviados al panel`
          : pedidos.quedan > 0
            ? ` · ${pedidos.quedan} pedido(s) no se pudieron enviar`
            : ''
      await onOk(`Sync OK · ${r.productos} productos en la PC (${r.modo})${extra}`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Falló la sincronización')
    } finally {
      setTrabajando(false)
    }
  }

  const publicarWeb = async () => {
    if (pendientes <= 0) {
      onError('No hay cambios pendientes para publicar.')
      return
    }
    if (!clave.trim()) {
      onError('Escribí la clave compartida (una sola vez).')
      return
    }
    if (
      !confirm(
        `Se van a subir ${pendientes} cambio(s) a la web (stock y altas sin foto). ¿Continuar?`,
      )
    ) {
      return
    }
    setTrabajando(true)
    setEstado(null)
    try {
      await guardarClaveNube(clave)
      const r = await publicarEnNube(clave)
      await onOk(
        `Web OK · ${r.altas} altas, ${r.ediciones} stock/ediciones` +
          (r.bajas ? `, ${r.bajas} bajas` : '') +
          '. En 1–2 min se ve en el sitio.',
      )
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No se pudo publicar a la web')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>Publicar</h1>
          <small>
            {pendientes > 0 ? `${pendientes} cambios pendientes` : 'Sin cambios pendientes'}
          </small>
        </div>
        <button type="button" className="boton fantasma" onClick={onVolver}>
          Volver
        </button>
      </header>
      <main className="contenido">
        <section className="bloque-sync">
          <h2 className="titulo-seccion">A la web (desde cualquier lado)</h2>
          <p className="aviso">
            Sube stock y productos nuevos <strong>sin foto</strong>. Las imágenes las cargás después
            en el panel.
          </p>
          <label className="campo">
            <span>Clave compartida</span>
            <input
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="La misma que en Netlify"
              autoCapitalize="off"
              autoCorrect="off"
              type="password"
            />
          </label>
          <button
            type="button"
            className="boton bloque primario"
            disabled={trabajando || pendientes <= 0}
            onClick={() => void publicarWeb()}
          >
            Publicar a la web
          </button>
        </section>

        <section className="bloque-sync" style={{ marginTop: 22 }}>
          <h2 className="titulo-seccion">A la PC (misma WiFi)</h2>
          <p className="aviso">
            En la PC: panel → <strong>Sync celular</strong> → escaneá el QR.
            <br />
            {guardada ? `PC configurada: ${guardada}` : 'Configurá la PC una sola vez.'}
          </p>

          <button type="button" className="boton bloque oro" disabled={trabajando} onClick={() => void escanearQrPc()}>
            Escanear QR de la PC
          </button>

          <label className="campo" style={{ marginTop: 14 }}>
            <span>IP de la PC (manual)</span>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.0.15"
              inputMode="decimal"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>

          {estado && <p className="aviso ok">{estado}</p>}

          <div className="formulario" style={{ marginTop: 12 }}>
            <button type="button" className="boton bloque" disabled={!ip || trabajando} onClick={() => void guardarConfig()}>
              Guardar IP
            </button>
            <button type="button" className="boton bloque" disabled={!ip || trabajando} onClick={() => void probar()}>
              Probar conexión
            </button>
            <button
              type="button"
              className="boton bloque primario"
              disabled={!ip || trabajando}
              onClick={() => void enviar(false)}
            >
              Enviar cambios a la PC
            </button>
            <button
              type="button"
              className="boton bloque fantasma"
              disabled={!ip || trabajando}
              onClick={() => {
                if (confirm('Esto fusiona TODO el catálogo del celu en la PC. ¿Seguro?')) void enviar(true)
              }}
            >
              Enviar catálogo completo
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function PantallaPedido({
  productos,
  onVolver,
  onOk,
}: {
  productos: Producto[]
  onVolver: () => void
  onOk: (mensaje: string) => void | Promise<void>
}) {
  const [modo, setModo] = useState<'pegar' | 'armar'>('pegar')
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<PedidoResuelto | null>(null)
  const [lineasArmado, setLineasArmado] = useState<{ producto: Producto; cantidad: number }[]>([])
  const [trabajando, setTrabajando] = useState(false)
  const [cola, setCola] = useState<PedidoLocalPendiente[]>([])
  const [avisoLocal, setAvisoLocal] = useState<{ texto: string; tipo: 'ok' | 'error' | 'info' } | null>(
    null,
  )

  const previewArmado = useMemo(
    () => (modo === 'armar' ? armarPedidoDesdeLineas(lineasArmado, productos) : null),
    [modo, lineasArmado, productos],
  )
  const activo = modo === 'armar' ? previewArmado : preview

  const refrescarCola = useCallback(async () => {
    setCola(await leerPedidosLocales())
  }, [])

  useEffect(() => {
    void refrescarCola()
  }, [refrescarCola])

  const leer = () => {
    setAvisoLocal(null)
    const resuelto = parsearPedido(texto, productos)
    setPreview(resuelto)
    if (resuelto.errores.length) {
      setAvisoLocal({ texto: resuelto.errores[0], tipo: 'error' })
    }
  }

  const escanearProducto = async () => {
    try {
      setAvisoLocal({ texto: 'Abriendo cámara…', tipo: 'info' })
      const codigo = await escanearCodigo((texto) => setAvisoLocal({ texto, tipo: 'info' }))
      if (!codigo) {
        setAvisoLocal(null)
        return
      }
      const coincidencias = buscarPorCodigo(productos, codigo)
      if (coincidencias.length === 0) {
        setAvisoLocal({ texto: `No hay producto con código ${codigo} en el catálogo.`, tipo: 'error' })
        return
      }
      if (coincidencias.length > 1) {
        setAvisoLocal({
          texto: `Hay ${coincidencias.length} cosechas con ese código. Elegí una en el listado o unificá códigos.`,
          tipo: 'error',
        })
        // Si hay varias, tomamos la primera con stock o la primera; better UX: add first and warn
      }
      const elegido = coincidencias.find((p) => p.stock > 0) ?? coincidencias[0]
      setLineasArmado((prev) => {
        const idx = prev.findIndex((l) => l.producto.id === elegido.id)
        if (idx >= 0) {
          return prev.map((l, i) => (i === idx ? { ...l, cantidad: l.cantidad + 1 } : l))
        }
        return [...prev, { producto: elegido, cantidad: 1 }]
      })
      setAvisoLocal({
        texto: `+ ${elegido.nombre}${elegido.variedad ? ` · ${elegido.variedad}` : ''}`,
        tipo: 'ok',
      })
    } catch (error) {
      setAvisoLocal({
        texto: error instanceof Error ? error.message : 'No se pudo escanear.',
        tipo: 'error',
      })
    }
  }

  const setCantidadArmado = (id: string, cantidad: number) => {
    setLineasArmado((prev) => {
      if (cantidad < 1) return prev.filter((l) => l.producto.id !== id)
      return prev.map((l) => (l.producto.id === id ? { ...l, cantidad } : l))
    })
  }

  const guardarOffline = async () => {
    if (!activo?.codigo || activo.errores.length) {
      setAvisoLocal({ texto: 'Primero armá o leé un pedido válido.', tipo: 'error' })
      return
    }
    setTrabajando(true)
    try {
      const r = await guardarPedidoLocal(activo.codigo)
      await refrescarCola()
      setAvisoLocal({
        texto: r.yaEstaba
          ? `El pedido ${activo.codigo} ya estaba guardado offline.`
          : `Pedido ${activo.codigo} guardado offline. Cuando haya WiFi con el panel, usá «Enviar pendientes».`,
        tipo: 'info',
      })
      setTexto('')
      setPreview(null)
      setLineasArmado([])
    } finally {
      setTrabajando(false)
    }
  }

  const enviar = async () => {
    if (!activo?.codigo || activo.errores.length) {
      setAvisoLocal({ texto: 'Primero armá o leé un pedido válido.', tipo: 'error' })
      return
    }
    setTrabajando(true)
    setAvisoLocal(null)
    try {
      const hostGuardado = await leerIpPc()
      if (!hostGuardado) {
        await guardarPedidoLocal(activo.codigo)
        await refrescarCola()
        setAvisoLocal({
          texto: `Sin IP de la PC: el pedido quedó guardado offline. Configurá Sync PC y después «Enviar pendientes».`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
        setLineasArmado([])
        return
      }
      const r = await enviarPedidoAPc(hostGuardado, activo.codigo)
      await refrescarCola()
      if (r.yaEstaba) {
        setAvisoLocal({
          texto: `Este pedido (${activo.codigo}) ya está pendiente en el panel. No hace falta enviarlo de nuevo: confirmalo ahí.`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
        setLineasArmado([])
        return
      }
      setTexto('')
      setPreview(null)
      setLineasArmado([])
      await onOk(`Pedido ${activo.codigo} enviado al panel · confirmá ahí para descontar`)
    } catch (error) {
      const textoError = error instanceof Error ? error.message : 'No se pudo enviar'
      if (textoError.includes('ya fue confirmado')) {
        setAvisoLocal({
          texto: `Este pedido ya fue confirmado antes. No se puede enviar de nuevo.`,
          tipo: 'error',
        })
      } else {
        await guardarPedidoLocal(activo.codigo)
        await refrescarCola()
        setAvisoLocal({
          texto: `Sin conexión con el panel: el pedido ${activo.codigo} quedó guardado offline. Cuando vuelva la WiFi, tocá «Enviar pendientes».`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
        setLineasArmado([])
      }
    } finally {
      setTrabajando(false)
    }
  }

  const enviarCola = async () => {
    if (!cola.length) {
      setAvisoLocal({ texto: 'No hay pedidos offline pendientes.', tipo: 'info' })
      return
    }
    setTrabajando(true)
    setAvisoLocal(null)
    try {
      const hostGuardado = await leerIpPc()
      if (!hostGuardado) {
        setAvisoLocal({
          texto: 'Configurá la IP de la PC en Sync PC antes de enviar.',
          tipo: 'error',
        })
        return
      }
      const r = await enviarPedidosLocalesAPc(hostGuardado)
      await refrescarCola()
      if (r.quedan === 0 && r.fallidos.length === 0) {
        await onOk(
          `Se enviaron ${r.enviados + r.yaEstaban} pedido(s) al panel. Cola offline vacía.`,
        )
        return
      }
      setAvisoLocal({
        texto: `Enviados: ${r.enviados + r.yaEstaban}. Quedan ${r.quedan} offline.${
          r.fallidos[0] ? ` Error: ${r.fallidos[0].error}` : ''
        }`,
        tipo: r.quedan > 0 ? 'error' : 'ok',
      })
    } catch (error) {
      setAvisoLocal({
        texto: error instanceof Error ? error.message : 'No se pudo enviar la cola',
        tipo: 'error',
      })
    } finally {
      setTrabajando(false)
    }
  }

  const puedeEnviar = Boolean(activo?.codigo) && !activo?.errores.length

  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>Pedido</h1>
          <small>
            Pegá WhatsApp o armá escaneando
            {cola.length > 0 ? ` · ${cola.length} offline` : ''}
          </small>
        </div>
        <button type="button" className="boton fantasma" onClick={onVolver}>
          Volver
        </button>
      </header>
      <main className="contenido">
        <div className="pedido-modos" role="tablist" aria-label="Modo de pedido">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'pegar'}
            className={modo === 'pegar' ? 'activo' : ''}
            onClick={() => {
              setModo('pegar')
              setAvisoLocal(null)
            }}
          >
            Pegar WhatsApp
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'armar'}
            className={modo === 'armar' ? 'activo' : ''}
            onClick={() => {
              setModo('armar')
              setAvisoLocal(null)
            }}
          >
            Armar escaneando
          </button>
        </div>

        {avisoLocal && (
          <p className={`aviso ${avisoLocal.tipo === 'info' ? 'info' : avisoLocal.tipo}`}>{avisoLocal.texto}</p>
        )}

        {modo === 'pegar' ? (
          <div className="pedido-panel">
            <p className="aviso">
              Pegá el mensaje de WhatsApp, leé el código y enviálo al panel (o guardalo offline).
            </p>
            <label className="campo">
              <span>Mensaje o código (#1x2,3x1)</span>
              <textarea
                rows={5}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Pegá acá el WhatsApp…"
              />
            </label>
            <button type="button" className="boton bloque" disabled={trabajando} onClick={leer}>
              Leer código
            </button>

            {preview && (
              <div className="aviso pedido-preview">
                {[
                  preview.codigo,
                  '',
                  ...preview.lineas.map((linea) => {
                    const nombre = linea.producto
                      ? etiquetaProducto(linea.producto)
                      : `Producto #${linea.indice} (no encontrado)`
                    const sub = linea.producto
                      ? precio(subtotalLinea(linea.producto, linea.cantidad))
                      : '—'
                    const stock = linea.producto != null ? ` · stock ${linea.producto.stock}` : ''
                    return `• ${linea.cantidad} × ${nombre} — ${sub}${stock}`
                  }),
                  '',
                  `Total: ${precio(preview.total)}`,
                  preview.errores.length ? `\n⚠ ${preview.errores.join(' · ')}` : '',
                ].join('\n')}
              </div>
            )}
          </div>
        ) : (
          <div className="pedido-panel pedido-armado">
            <p className="aviso">
              Escaneá cada botella, ajustá cantidades y después guardá o enviá el pedido.
            </p>

            <button
              type="button"
              className="boton bloque oro pedido-armado-escanear"
              disabled={trabajando}
              onClick={() => void escanearProducto()}
            >
              Escanear producto
            </button>

            {lineasArmado.length === 0 ? (
              <p className="pedido-armado-vacio">Todavía no hay ítems. Tocá escanear para sumar la primera botella.</p>
            ) : (
              <ul className="pedido-armado-lista">
                {lineasArmado.map((linea) => (
                  <li key={linea.producto.id}>
                    <div className="pedido-armado-info">
                      <strong>{linea.producto.nombre}</strong>
                      <small>
                        {[linea.producto.variedad, precio(linea.producto.precio)].filter(Boolean).join(' · ')}
                        {linea.cantidad >= 2 && linea.producto.precioCaja != null
                          ? ` · promo ${precio(linea.producto.precioCaja)}`
                          : ''}
                      </small>
                      <small className="pedido-armado-sub">
                        Subtotal {precio(subtotalLinea(linea.producto, linea.cantidad))}
                      </small>
                    </div>
                    <div className="pedido-armado-qty">
                      <button
                        type="button"
                        aria-label="Bajar cantidad"
                        onClick={() => setCantidadArmado(linea.producto.id, linea.cantidad - 1)}
                      >
                        −
                      </button>
                      <span>{linea.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Subir cantidad"
                        onClick={() => setCantidadArmado(linea.producto.id, linea.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {previewArmado && previewArmado.codigo && (
              <div className="pedido-armado-total">
                <code>{previewArmado.codigo}</code>
                <strong>Total {precio(previewArmado.total)}</strong>
              </div>
            )}
          </div>
        )}

        <div className="pedido-acciones">
          <button
            type="button"
            className="boton bloque oro"
            disabled={trabajando || !puedeEnviar}
            onClick={() => void enviar()}
          >
            Enviar al panel
          </button>
          <button
            type="button"
            className="boton bloque"
            disabled={trabajando || !puedeEnviar}
            onClick={() => void guardarOffline()}
          >
            Guardar offline
          </button>
        </div>

        {cola.length > 0 && (
          <div className="pedido-cola">
            <div className="pedido-cola-cab">
              <strong>Pendientes offline ({cola.length})</strong>
              <button
                type="button"
                className="boton oro"
                disabled={trabajando}
                onClick={() => void enviarCola()}
              >
                Enviar pendientes
              </button>
            </div>
            <ul className="pedido-cola-lista">
              {cola.map((p) => (
                <li key={p.id}>
                  <code>{p.codigo}</code>
                  <small>{new Date(p.fecha).toLocaleString('es-AR')}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

function Editor({
  producto: inicial,
  esNuevo,
  onVolver,
  onGuardar,
  onEliminar,
}: {
  producto: Producto
  esNuevo: boolean
  onVolver: () => void
  onGuardar: (producto: Producto, esNuevo: boolean) => Promise<void>
  onEliminar: (id: string) => Promise<void>
}) {
  const [producto, setProducto] = useState(inicial)
  const [sugeriendo, setSugeriendo] = useState(false)
  const [avisoLocal, setAvisoLocal] = useState<{ texto: string; tipo: 'ok' | 'error' | 'info' } | null>(
    null,
  )

  const set = <K extends keyof Producto>(clave: K, valor: Producto[K]) => {
    setProducto((previo) => ({ ...previo, [clave]: valor }))
  }

  const completarPorCodigo = async () => {
    if (!producto.codigoBarras.trim()) {
      setAvisoLocal({ texto: 'Cargá o escaneá un código de barras primero.', tipo: 'error' })
      return
    }
    setSugeriendo(true)
    setAvisoLocal({ texto: 'Buscando en Open Food Facts…', tipo: 'info' })
    try {
      const r = await sugerirDesdeCodigoBarras(producto.codigoBarras)
      setProducto((prev) => aplicarSugerencia(prev, r.sugerencia))
      setAvisoLocal({
        texto: `${r.aviso} Si faltan maridaje/notas, usá «Completar con IA» (panel abierto).`,
        tipo: 'ok',
      })
    } catch (error) {
      setAvisoLocal({
        texto: error instanceof Error ? error.message : 'No se encontró el código',
        tipo: 'error',
      })
    } finally {
      setSugeriendo(false)
    }
  }

  const escanearParaCampo = async () => {
    try {
      setAvisoLocal({ texto: 'Abriendo cámara…', tipo: 'info' })
      const codigo = await escanearCodigo((texto) => setAvisoLocal({ texto, tipo: 'info' }))
      if (!codigo) {
        setAvisoLocal(null)
        return
      }
      set('codigoBarras', codigo)
      setAvisoLocal({ texto: `Código cargado: ${codigo}`, tipo: 'ok' })
    } catch (error) {
      setAvisoLocal({
        texto: error instanceof Error ? error.message : 'No se pudo escanear.',
        tipo: 'error',
      })
    }
  }

  const completarConIa = async () => {
    if (!producto.nombre.trim() && !producto.bodega.trim() && !producto.codigoBarras.trim()) {
      setAvisoLocal({
        texto: 'Poné al menos el nombre (ej. DV Cabernet Malbec) o el código.',
        tipo: 'error',
      })
      return
    }
    setSugeriendo(true)
    setAvisoLocal({ texto: 'Consultando IA vía el panel…', tipo: 'info' })
    try {
      const r = await sugerirDesdePanel({
        codigoBarras: producto.codigoBarras,
        nombre: producto.nombre,
        bodega: producto.bodega,
        variedad: producto.variedad,
        tipo: producto.tipo,
        forzarIa: true,
      })
      setProducto((prev) => aplicarSugerencia(prev, r.sugerencia))
      setAvisoLocal({ texto: r.aviso || 'Listo. Revisá y guardá.', tipo: 'ok' })
    } catch (error) {
      setAvisoLocal({
        texto: error instanceof Error ? error.message : 'No se pudo completar con IA',
        tipo: 'error',
      })
    } finally {
      setSugeriendo(false)
    }
  }

  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>{esNuevo ? 'Nuevo vino' : 'Editar vino'}</h1>
          <small>{producto.codigoBarras || 'Sin código de barras'}</small>
        </div>
        <button type="button" className="boton fantasma" onClick={onVolver}>
          Volver
        </button>
      </header>

      <main className="contenido">
        <form
          className="formulario"
          onSubmit={(evento) => {
            evento.preventDefault()
            void onGuardar(producto, esNuevo)
          }}
        >
          <label className="campo">
            <span>Nombre</span>
            <input value={producto.nombre} onChange={(e) => set('nombre', e.target.value)} required />
          </label>

          <div className="grilla-2">
            <label className="campo">
              <span>Bodega</span>
              <input value={producto.bodega} onChange={(e) => set('bodega', e.target.value)} />
            </label>
            <label className="campo">
              <span>Tipo</span>
              <select value={producto.tipo} onChange={(e) => set('tipo', e.target.value as Producto['tipo'])}>
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grilla-2">
            <label className="campo">
              <span>Variedad</span>
              <input value={producto.variedad} onChange={(e) => set('variedad', e.target.value)} />
            </label>
            <label className="campo">
              <span>Cosecha</span>
              <input
                type="number"
                value={producto.anio ?? ''}
                onChange={(e) => set('anio', e.target.value === '' ? null : Number(e.target.value))}
              />
            </label>
          </div>

          <div className="grilla-2">
            <label className="campo">
              <span>Precio</span>
              <input
                type="number"
                min={0}
                value={producto.precio}
                onChange={(e) => set('precio', Number(e.target.value) || 0)}
              />
            </label>
            <label className="campo">
              <span>Stock</span>
              <input
                type="number"
                min={0}
                value={producto.stock}
                onChange={(e) => set('stock', Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="campo">
            <span>Código de barras</span>
            <div className="campo-con-accion">
              <input
                value={producto.codigoBarras}
                onChange={(e) => set('codigoBarras', e.target.value)}
                inputMode="numeric"
                placeholder="Escaneá o escribí el código"
              />
              <button
                type="button"
                className="boton oro"
                disabled={sugeriendo}
                onClick={() => void escanearParaCampo()}
                aria-label="Escanear código de barras"
              >
                Escanear
              </button>
            </div>
          </div>

          <div className="pedido-acciones">
            <button
              type="button"
              className="boton bloque"
              disabled={sugeriendo}
              onClick={() => void completarPorCodigo()}
            >
              Completar por código
            </button>
            <button
              type="button"
              className="boton bloque oro"
              disabled={sugeriendo}
              onClick={() => void completarConIa()}
            >
              Completar con IA
            </button>
          </div>

          {avisoLocal && (
            <p className={`aviso ${avisoLocal.tipo === 'info' ? 'info' : avisoLocal.tipo}`}>{avisoLocal.texto}</p>
          )}

          <label className="campo">
            <span>Región</span>
            <input value={producto.region} onChange={(e) => set('region', e.target.value)} />
          </label>

          <div className="grilla-2">
            <label className="campo">
              <span>Volumen (ml)</span>
              <input
                type="number"
                min={0}
                value={producto.volumenMl || ''}
                onChange={(e) => set('volumenMl', Number(e.target.value) || 750)}
              />
            </label>
            <label className="campo">
              <span>Alcohol %</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={producto.graduacion ?? ''}
                onChange={(e) => set('graduacion', e.target.value === '' ? null : Number(e.target.value))}
              />
            </label>
          </div>

          <label className="campo">
            <span>Descripción</span>
            <textarea value={producto.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </label>

          <label className="campo">
            <span>Notas de cata (coma)</span>
            <input
              value={(producto.notas || []).join(', ')}
              onChange={(e) =>
                set(
                  'notas',
                  e.target.value
                    .split(',')
                    .map((n) => n.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>

          <label className="campo">
            <span>Maridaje</span>
            <input value={producto.maridaje} onChange={(e) => set('maridaje', e.target.value)} />
          </label>

          <label className="interruptor">
            <input
              type="checkbox"
              checked={estaActivo(producto)}
              onChange={(e) => set('activo', e.target.checked)}
            />
            <span>Publicado en la web</span>
          </label>

          <button type="submit" className="boton bloque primario" disabled={sugeriendo}>
            Guardar
          </button>

          {!esNuevo && (
            <button type="button" className="boton bloque fantasma" onClick={() => void onEliminar(producto.id)}>
              Eliminar
            </button>
          )}
        </form>
      </main>
    </div>
  )
}
