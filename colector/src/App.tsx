import { useCallback, useEffect, useMemo, useState } from 'react'
import { escanearCodigo } from './escaner'
import {
  enviarPedidoAPc,
  enviarPedidosLocalesAPc,
  guardarCatalogo,
  guardarIpPc,
  guardarPedidoLocal,
  importarCatalogoRemoto,
  leerCambios,
  leerCatalogo,
  leerIpPc,
  leerPedidosLocales,
  parsearHostSync,
  probarPc,
  registrarCambio,
  sincronizarConPc,
  type PedidoLocalPendiente,
} from './storage'
import { etiquetaProducto, parsearPedido, type PedidoResuelto } from './pedidoCodigo'
import {
  CATALOGO_ONLINE,
  TIPOS,
  buscarPorCodigo,
  generarId,
  precio,
  productoVacio,
  type Catalogo,
  type Producto,
} from './types'
import './index.css'

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
                {producto.bodega} · {precio(producto.precio)} · stock {producto.stock}
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
      <header className="barra">
        <div>
          <h1>Vinos Colector</h1>
          <small>
            {productos.length} productos
            {pendientes > 0 ? ` · ${pendientes} cambios pendientes` : ' · sincronizado local'}
            {pedidosLocales > 0 ? ` · ${pedidosLocales} pedido${pedidosLocales === 1 ? '' : 's'} por enviar` : ''}
          </small>
        </div>
        <div className="acciones-barra">
          <button type="button" className="boton fantasma" onClick={() => setPantalla({ tipo: 'pedido' })}>
            Pedido{pedidosLocales > 0 ? ` (${pedidosLocales})` : ''}
          </button>
          <button type="button" className="boton fantasma" onClick={() => setPantalla({ tipo: 'sync' })}>
            Sync PC
          </button>
          <button type="button" className="boton fantasma" onClick={importarOnline} title="Traer catálogo de la web">
            ↓ Web
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
              <article key={producto.id} className="tarjeta">
                <button
                  type="button"
                  className="info"
                  style={{ background: 'transparent', border: 0, color: 'inherit', textAlign: 'left', padding: 0 }}
                  onClick={() => setPantalla({ tipo: 'editor', esNuevo: false, producto: { ...producto } })}
                >
                  <p className="nombre">{producto.nombre}</p>
                  <p className="meta">
                    {[producto.bodega, producto.anio, precio(producto.precio)].filter(Boolean).join(' · ')}
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
  const [trabajando, setTrabajando] = useState(false)
  const [estado, setEstado] = useState<string | null>(null)

  useEffect(() => {
    void leerIpPc().then((valor) => {
      setIp(valor)
      setGuardada(valor)
    })
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

  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>Sync a la PC</h1>
          <small>
            {guardada ? `PC configurada: ${guardada}` : 'Configurá la PC una sola vez'}
            {pendientes > 0 ? ` · ${pendientes} pendientes` : ''}
          </small>
        </div>
        <button type="button" className="boton fantasma" onClick={onVolver}>
          Volver
        </button>
      </header>
      <main className="contenido">
        <p className="aviso">
          En la PC: panel → <strong>Sync celular</strong> → escaneá el QR.
          <br />
          La IP se guarda en el celular para no cargarla de nuevo.
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
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<PedidoResuelto | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [cola, setCola] = useState<PedidoLocalPendiente[]>([])
  const [avisoLocal, setAvisoLocal] = useState<{ texto: string; tipo: 'ok' | 'error' | 'info' } | null>(
    null,
  )

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

  const guardarOffline = async () => {
    if (!preview?.codigo || preview.errores.length) {
      setAvisoLocal({ texto: 'Primero leé un código válido.', tipo: 'error' })
      return
    }
    setTrabajando(true)
    try {
      const r = await guardarPedidoLocal(preview.codigo)
      await refrescarCola()
      setAvisoLocal({
        texto: r.yaEstaba
          ? `El pedido ${preview.codigo} ya estaba guardado offline.`
          : `Pedido ${preview.codigo} guardado offline. Cuando haya WiFi con el panel, usá «Enviar pendientes».`,
        tipo: 'info',
      })
      setTexto('')
      setPreview(null)
    } finally {
      setTrabajando(false)
    }
  }

  const enviar = async () => {
    if (!preview?.codigo || preview.errores.length) {
      setAvisoLocal({ texto: 'Primero leé un código válido.', tipo: 'error' })
      return
    }
    setTrabajando(true)
    setAvisoLocal(null)
    try {
      const hostGuardado = await leerIpPc()
      if (!hostGuardado) {
        await guardarPedidoLocal(preview.codigo)
        await refrescarCola()
        setAvisoLocal({
          texto: `Sin IP de la PC: el pedido quedó guardado offline. Configurá Sync PC y después «Enviar pendientes».`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
        return
      }
      const r = await enviarPedidoAPc(hostGuardado, preview.codigo)
      await refrescarCola()
      if (r.yaEstaba) {
        setAvisoLocal({
          texto: `Este pedido (${preview.codigo}) ya está pendiente en el panel. No hace falta enviarlo de nuevo: confirmalo ahí.`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
        return
      }
      await onOk(`Pedido ${preview.codigo} enviado al panel · confirmá ahí para descontar`)
    } catch (error) {
      const textoError = error instanceof Error ? error.message : 'No se pudo enviar'
      if (textoError.includes('ya fue confirmado')) {
        setAvisoLocal({
          texto: `Este pedido ya fue confirmado antes. No se puede enviar de nuevo.`,
          tipo: 'error',
        })
      } else {
        // Sin conexión / panel cerrado → queda en cola local
        await guardarPedidoLocal(preview.codigo)
        await refrescarCola()
        setAvisoLocal({
          texto: `Sin conexión con el panel: el pedido ${preview.codigo} quedó guardado offline. Cuando vuelva la WiFi, tocá «Enviar pendientes».`,
          tipo: 'info',
        })
        setTexto('')
        setPreview(null)
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

  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>Pedido WhatsApp</h1>
          <small>
            Pegá el mensaje, compará y enviá al panel
            {cola.length > 0 ? ` · ${cola.length} offline` : ''}
          </small>
        </div>
        <button type="button" className="boton fantasma" onClick={onVolver}>
          Volver
        </button>
      </header>
      <main className="contenido">
        <p className="aviso">
          Sin WiFi podés guardar el pedido offline. Cuando conectes con el panel, enviá los
          pendientes (también se mandan al hacer Sync PC).
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
        <div className="pedido-acciones">
          <button type="button" className="boton bloque" disabled={trabajando} onClick={leer}>
            Leer código
          </button>
          <button
            type="button"
            className="boton bloque oro"
            disabled={trabajando || !preview?.codigo || Boolean(preview.errores.length)}
            onClick={() => void enviar()}
          >
            Enviar al panel
          </button>
          <button
            type="button"
            className="boton bloque"
            disabled={trabajando || !preview?.codigo || Boolean(preview.errores.length)}
            onClick={() => void guardarOffline()}
          >
            Guardar offline
          </button>
        </div>

        {avisoLocal && (
          <p className={`aviso ${avisoLocal.tipo === 'info' ? 'info' : avisoLocal.tipo}`}>{avisoLocal.texto}</p>
        )}

        {preview && (
          <div className="aviso" style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>
            {[
              preview.codigo,
              '',
              ...preview.lineas.map((linea) => {
                const nombre = linea.producto
                  ? etiquetaProducto(linea.producto)
                  : `Producto #${linea.indice} (no encontrado)`
                const sub = linea.producto ? precio(linea.producto.precio * linea.cantidad) : '—'
                const stock = linea.producto != null ? ` · stock ${linea.producto.stock}` : ''
                return `• ${linea.cantidad} × ${nombre} — ${sub}${stock}`
              }),
              '',
              `Total: ${precio(preview.total)}`,
              preview.errores.length ? `\n⚠ ${preview.errores.join(' · ')}` : '',
            ].join('\n')}
          </div>
        )}

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

  const set = <K extends keyof Producto>(clave: K, valor: Producto[K]) => {
    setProducto((previo) => ({ ...previo, [clave]: valor }))
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

          <label className="campo">
            <span>Código de barras</span>
            <input
              value={producto.codigoBarras}
              onChange={(e) => set('codigoBarras', e.target.value)}
              inputMode="numeric"
            />
          </label>

          <label className="campo">
            <span>Región</span>
            <input value={producto.region} onChange={(e) => set('region', e.target.value)} />
          </label>

          <label className="campo">
            <span>Descripción</span>
            <textarea value={producto.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
          </label>

          <button type="submit" className="boton bloque primario">
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
