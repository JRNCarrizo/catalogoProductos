const $ = (selector) => document.querySelector(selector)

const elementos = {
  estadoArchivo: $('#estado-archivo'),
  punto: $('.punto'),
  lista: $('#lista-productos'),
  contador: $('#contador'),
  syncInfo: $('#sync-info'),
  capaSync: $('#capa-sync'),
  syncEndpoints: $('#sync-endpoints'),
  syncAyudaVacio: $('#sync-ayuda-vacio'),
  vistaCatalogo: $('#vista-catalogo'),
  vistaPedidos: $('#vista-pedidos'),
  btnPedidos: $('#btn-pedidos'),
  pedidosTabs: $('#pedidos-tabs'),
  pedidosNuevoGrid: $('#pedidos-nuevo-grid'),
  pedidoTexto: $('#pedido-texto'),
  pedidoPanelPreview: $('#pedidos-preview-panel'),
  pedidoPreview: $('#pedido-preview'),
  pedidoPreviewCodigo: $('#pedido-preview-codigo'),
  pedidoPreviewTotal: $('#pedido-preview-total'),
  pedidoPendientes: $('#pedido-pendientes'),
  pedidoHistorial: $('#pedido-historial'),
  pedidoCountPen: $('#pedido-count-pen'),
  pedidoCountHist: $('#pedido-count-hist'),
  btnPedidoConfirmar: $('#btn-pedido-confirmar'),
  buscador: $('#buscador'),
  formulario: $('#formulario'),
  editorVacio: $('#editor-vacio'),
  tituloEditor: $('#titulo-editor'),
  fotoVista: $('#foto-vista'),
  fotoAyuda: $('#foto-ayuda'),
  btnQuitarFondo: $('#btn-quitar-fondo'),
  aviso: $('#aviso'),
  capaPublicar: $('#capa-publicar'),
  logPublicar: $('#log-publicar'),
  mensajeCommit: $('#mensaje-commit'),
  btnConfirmarPublicar: $('#btn-confirmar-publicar'),
}

const estado = {
  catalogo: { actualizado: '', moneda: 'ARS', productos: [] },
  seleccionId: null,
  sucio: false,
  pedidos: { pendientes: [], historial: [] },
  previewPedido: null,
}

const productoVacio = () => ({
  id: '',
  nombre: '',
  bodega: '',
  tipo: 'Tinto',
  variedad: '',
  anio: null,
  region: '',
  precio: 0,
  precioAnterior: null,
  precioCaja: null,
  volumenMl: 750,
  graduacion: null,
  stock: 0,
  destacado: false,
  activo: true,
  codigoBarras: '',
  imagen: '',
  descripcion: '',
  notas: [],
  maridaje: '',
})

function avisar(texto, tipo = '') {
  elementos.aviso.textContent = texto
  elementos.aviso.className = `aviso ${tipo}`
  clearTimeout(avisar.temporizador)
  avisar.temporizador = setTimeout(() => elementos.aviso.classList.add('oculto'), 3200)
}

function marcarSucio(sucio) {
  estado.sucio = sucio
  elementos.punto.classList.toggle('sucio', sucio)
  elementos.estadoArchivo.textContent = sucio
    ? 'Hay cambios sin guardar'
    : `Guardado · ${estado.catalogo.productos.length} vinos`
}

function generarId(producto) {
  const base = [producto.bodega, producto.nombre, producto.anio].filter(Boolean).join(' ')
  const slug = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const existentes = new Set(estado.catalogo.productos.map((item) => item.id))
  let candidato = slug || `vino-${Date.now()}`
  let contador = 2
  while (existentes.has(candidato)) candidato = `${slug}-${contador++}`
  return candidato
}

function productoActual() {
  return estado.catalogo.productos.find((producto) => producto.id === estado.seleccionId) ?? null
}

function ajustarStock(id, delta) {
  const producto = estado.catalogo.productos.find((item) => item.id === id)
  if (!producto) return

  const actual = Number(producto.stock) || 0
  producto.stock = Math.max(0, actual + delta)
  marcarSucio(true)

  // Si ese producto está abierto en el editor, sincronizamos el campo.
  if (estado.seleccionId === id) {
    elementos.formulario.elements.stock.value = producto.stock
  }

  dibujarLista()
}

function dibujarLista() {
  const termino = elementos.buscador.value.trim().toLowerCase()
  const visibles = estado.catalogo.productos.filter((producto) =>
    [producto.nombre, producto.bodega, producto.variedad, producto.tipo]
      .join(' ')
      .toLowerCase()
      .includes(termino),
  )

  elementos.lista.innerHTML = ''
  for (const producto of visibles) {
    const item = document.createElement('li')
    item.dataset.id = producto.id
    if (producto.id === estado.seleccionId) item.classList.add('activo')
    if (producto.activo === false) item.classList.add('oculto-web')

    const info = document.createElement('div')
    info.className = 'info'

    const nombre = document.createElement('div')
    nombre.className = 'nombre'
    nombre.textContent = producto.nombre || 'Sin nombre'
    if (producto.destacado) {
      const estrella = document.createElement('span')
      estrella.className = 'marca-destacado'
      estrella.textContent = '★'
      nombre.append(estrella)
    }
    if (producto.activo === false) {
      const marca = document.createElement('span')
      marca.className = 'marca-oculto'
      marca.textContent = 'oculto'
      nombre.append(marca)
    }

    const meta = document.createElement('span')
    meta.className = 'meta'
    meta.textContent = [producto.bodega, producto.anio, `$${Number(producto.precio).toLocaleString('es-AR')}`]
      .filter(Boolean)
      .join(' · ')

    info.append(nombre, meta)

    const stock = document.createElement('div')
    stock.className = 'stock-control'
    if (Number(producto.stock) <= 0) stock.classList.add('sin-stock-activo')

    const btnMenos = document.createElement('button')
    btnMenos.type = 'button'
    btnMenos.className = 'stock-btn'
    btnMenos.textContent = '−'
    btnMenos.title = 'Quitar una unidad'
    btnMenos.setAttribute('aria-label', `Bajar stock de ${producto.nombre || 'producto'}`)
    btnMenos.disabled = Number(producto.stock) <= 0
    btnMenos.addEventListener('click', (evento) => {
      evento.stopPropagation()
      ajustarStock(producto.id, -1)
    })

    const cantidad = document.createElement('span')
    cantidad.className = 'stock-cantidad'
    cantidad.textContent = String(Number(producto.stock) || 0)

    const btnMas = document.createElement('button')
    btnMas.type = 'button'
    btnMas.className = 'stock-btn'
    btnMas.textContent = '+'
    btnMas.title = 'Sumar una unidad'
    btnMas.setAttribute('aria-label', `Subir stock de ${producto.nombre || 'producto'}`)
    btnMas.addEventListener('click', (evento) => {
      evento.stopPropagation()
      ajustarStock(producto.id, 1)
    })

    stock.append(btnMenos, cantidad, btnMas)

    item.append(info, stock)
    item.addEventListener('click', () => seleccionar(producto.id))
    elementos.lista.append(item)
  }

  elementos.contador.textContent = String(estado.catalogo.productos.length)
}

async function dibujarFoto(producto) {
  if (elementos.btnQuitarFondo) {
    elementos.btnQuitarFondo.disabled = !producto?.imagen
  }

  if (!producto?.imagen) {
    elementos.fotoVista.textContent = 'Sin foto'
    return
  }

  elementos.fotoVista.textContent = 'Cargando…'
  try {
    const url = await window.panel.urlRecurso(producto.imagen)
    if (!url) {
      elementos.fotoVista.textContent = 'Foto no encontrada'
      return
    }
    elementos.fotoVista.innerHTML = ''
    const imagen = document.createElement('img')
    imagen.src = url
    imagen.alt = producto.nombre || ''
    imagen.onerror = () => {
      elementos.fotoVista.textContent = 'No se pudo mostrar'
    }
    elementos.fotoVista.append(imagen)
  } catch {
    elementos.fotoVista.textContent = 'No se pudo mostrar'
  }
}

function setProgresoFoto(texto) {
  if (!elementos.fotoAyuda) return
  elementos.fotoAyuda.textContent =
    texto ||
    'Al elegir una imagen se quita el fondo blanco automáticamente (ideal para fotos de botella).'
}

function seleccionar(id) {
  estado.seleccionId = id
  const producto = productoActual()
  if (!producto) return

  elementos.editorVacio.classList.add('oculto')
  elementos.formulario.classList.remove('oculto')
  elementos.tituloEditor.textContent = producto.nombre || 'Nuevo vino'

  const campos = elementos.formulario.elements
  campos.nombre.value = producto.nombre ?? ''
  campos.bodega.value = producto.bodega ?? ''
  campos.tipo.value = producto.tipo ?? 'Tinto'
  campos.variedad.value = producto.variedad ?? ''
  campos.anio.value = producto.anio ?? ''
  campos.region.value = producto.region ?? ''
  campos.precio.value = producto.precio ?? 0
  campos.precioAnterior.value = producto.precioAnterior ?? ''
  campos.precioCaja.value = producto.precioCaja ?? ''
  campos.stock.value = producto.stock ?? 0
  campos.codigoBarras.value = producto.codigoBarras ?? ''
  campos.volumenMl.value = producto.volumenMl ?? 750
  campos.graduacion.value = producto.graduacion ?? ''
  campos.descripcion.value = producto.descripcion ?? ''
  campos.notas.value = (producto.notas ?? []).join(', ')
  campos.maridaje.value = producto.maridaje ?? ''
  campos.destacado.checked = Boolean(producto.destacado)
  campos.activo.checked = producto.activo !== false

  dibujarFoto(producto)
  dibujarLista()
}

function numeroOpcional(valor) {
  if (valor === '' || valor === null) return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function leerFormulario() {
  const producto = productoActual()
  if (!producto) return

  const campos = elementos.formulario.elements
  producto.nombre = campos.nombre.value.trim()
  producto.bodega = campos.bodega.value.trim()
  producto.tipo = campos.tipo.value
  producto.variedad = campos.variedad.value.trim()
  producto.anio = numeroOpcional(campos.anio.value)
  producto.region = campos.region.value.trim()
  producto.precio = numeroOpcional(campos.precio.value) ?? 0
  producto.precioAnterior = numeroOpcional(campos.precioAnterior.value)
  producto.precioCaja = numeroOpcional(campos.precioCaja.value)
  producto.stock = numeroOpcional(campos.stock.value) ?? 0
  producto.codigoBarras = campos.codigoBarras.value.trim()
  producto.volumenMl = numeroOpcional(campos.volumenMl.value) ?? 750
  producto.graduacion = numeroOpcional(campos.graduacion.value)
  producto.descripcion = campos.descripcion.value.trim()
  producto.notas = campos.notas.value
    .split(',')
    .map((nota) => nota.trim())
    .filter(Boolean)
  producto.maridaje = campos.maridaje.value.trim()
  producto.destacado = campos.destacado.checked
  producto.activo = campos.activo.checked

  elementos.tituloEditor.textContent = producto.nombre || 'Nuevo vino'
  marcarSucio(true)
  dibujarLista()
}

const esProvisorio = (id) => !id || id.startsWith('tmp-')

async function guardar() {
  const seleccionado = productoActual()

  // Los ids provisorios se convierten en un slug estable recién al guardar,
  // cuando el vino ya tiene nombre y bodega.
  for (const producto of estado.catalogo.productos) {
    if (esProvisorio(producto.id) && producto.nombre) producto.id = generarId(producto)
  }
  estado.seleccionId = seleccionado?.id ?? null

  const faltaNombre = estado.catalogo.productos.some((producto) => !producto.nombre)
  if (faltaNombre) {
    avisar('Hay un vino sin nombre. Completalo antes de guardar.', 'error')
    return false
  }

  try {
    estado.catalogo = await window.panel.guardarCatalogo(estado.catalogo)
    marcarSucio(false)
    dibujarLista()
    avisar('Cambios guardados', 'exito')
    return true
  } catch (error) {
    avisar(`No se pudo guardar: ${error.message}`, 'error')
    return false
  }
}

function nuevo() {
  const producto = { ...productoVacio(), id: `tmp-${Date.now()}` }
  estado.catalogo.productos.unshift(producto)
  estado.seleccionId = producto.id
  elementos.editorVacio.classList.add('oculto')
  elementos.formulario.classList.remove('oculto')
  elementos.formulario.reset()
  elementos.formulario.elements.volumenMl.value = 750
  elementos.tituloEditor.textContent = 'Nuevo vino'
  elementos.fotoVista.textContent = 'Sin foto'
  marcarSucio(true)
  dibujarLista()
  elementos.formulario.elements.nombre.focus()
}

function eliminar() {
  const producto = productoActual()
  if (!producto) return
  if (!confirm(`¿Eliminar "${producto.nombre || 'este vino'}" del catálogo?`)) return

  estado.catalogo.productos = estado.catalogo.productos.filter((item) => item !== producto)
  estado.seleccionId = null
  elementos.formulario.classList.add('oculto')
  elementos.editorVacio.classList.remove('oculto')
  marcarSucio(true)
  dibujarLista()
}

async function procesarQuitarFondo(producto, rutaActual) {
  if (typeof window.quitarFondoDesdeDataUrl !== 'function') {
    throw new Error('Todavía se está cargando el quitador de fondo. Probá en unos segundos.')
  }

  const dataUrl = await window.panel.urlRecurso(rutaActual)
  if (!dataUrl) throw new Error('No se pudo leer la foto para quitar el fondo')

  const base64 = await window.quitarFondoDesdeDataUrl(dataUrl, setProgresoFoto)
  const ruta = await window.panel.guardarPng({
    idProducto: producto.id,
    base64,
    reemplazar: rutaActual,
  })
  return ruta
}

async function elegirFoto() {
  const producto = productoActual()
  if (!producto) return
  if (esProvisorio(producto.id) && producto.nombre) producto.id = generarId(producto)

  const boton = $('#btn-foto')
  if (boton) boton.disabled = true
  if (elementos.btnQuitarFondo) elementos.btnQuitarFondo.disabled = true

  try {
    const rutaOriginal = await window.panel.elegirImagen(producto.id)
    if (!rutaOriginal) return

    producto.imagen = rutaOriginal
    await dibujarFoto(producto)
    marcarSucio(true)

    setProgresoFoto('Quitando el fondo…')
    try {
      const rutaPng = await procesarQuitarFondo(producto, rutaOriginal)
      producto.imagen = rutaPng
      await dibujarFoto(producto)
      avisar('Foto lista sin fondo', 'exito')
    } catch (error) {
      avisar(
        `Se guardó la foto original. No se pudo quitar el fondo: ${
          error instanceof Error ? error.message : 'error'
        }`,
        'error',
      )
    }
  } catch (error) {
    avisar(error instanceof Error ? error.message : 'No se pudo cargar la foto', 'error')
  } finally {
    if (boton) boton.disabled = false
    setProgresoFoto('')
    if (elementos.btnQuitarFondo) elementos.btnQuitarFondo.disabled = !producto.imagen
  }
}

async function quitarFondoFotoActual() {
  const producto = productoActual()
  if (!producto?.imagen) return

  if (elementos.btnQuitarFondo) elementos.btnQuitarFondo.disabled = true
  const boton = $('#btn-foto')
  if (boton) boton.disabled = true
  setProgresoFoto('Quitando el fondo…')

  try {
    const ruta = await procesarQuitarFondo(producto, producto.imagen)
    producto.imagen = ruta
    await dibujarFoto(producto)
    marcarSucio(true)
    avisar('Fondo quitado', 'exito')
  } catch (error) {
    avisar(error instanceof Error ? error.message : 'No se pudo quitar el fondo', 'error')
  } finally {
    if (boton) boton.disabled = false
    setProgresoFoto('')
    if (elementos.btnQuitarFondo) elementos.btnQuitarFondo.disabled = !producto.imagen
  }
}

async function publicar() {
  elementos.btnConfirmarPublicar.disabled = true
  elementos.logPublicar.classList.remove('oculto')
  elementos.logPublicar.textContent = 'Guardando cambios…'

  if (estado.sucio && !(await guardar())) {
    elementos.btnConfirmarPublicar.disabled = false
    elementos.logPublicar.textContent = 'No se pudo guardar el catálogo.'
    return
  }

  elementos.logPublicar.textContent = 'Publicando…'
  const mensaje = (elementos.mensajeCommit.value || 'Actualizo el catalogo').trim()
  const resultado = await window.panel.publicar(mensaje)
  elementos.logPublicar.textContent = resultado.pasos
    .map(({ paso, salida }) => `› ${paso}\n${salida || 'ok'}`)
    .join('\n\n')
  elementos.btnConfirmarPublicar.disabled = false

  if (resultado.ok) {
    avisar(resultado.sinCambios ? 'No había cambios para publicar' : 'Catálogo publicado', 'exito')
    // Cerrar el modal: no tiene sentido dejarlo abierto para republicar lo mismo.
    setTimeout(() => {
      elementos.capaPublicar.classList.add('oculto')
      elementos.logPublicar.classList.add('oculto')
      elementos.logPublicar.textContent = ''
    }, 900)
  } else {
    avisar('La publicación falló. Revisá el detalle.', 'error')
  }
}

async function mostrarSync() {
  elementos.capaSync.classList.remove('oculto')
  elementos.syncEndpoints.innerHTML = ''
  elementos.syncAyudaVacio.classList.add('oculto')

  try {
    const sync = await window.panel.estadoSync()
    if (!sync.endpoints?.length) {
      elementos.syncAyudaVacio.classList.remove('oculto')
      elementos.syncInfo.textContent = `Sync WiFi en puerto ${sync.puerto} (sin IP de red)`
      return
    }

    for (const endpoint of sync.endpoints) {
      const caja = document.createElement('div')
      caja.className = 'sync-endpoint'

      const img = document.createElement('img')
      img.src = endpoint.qr
      img.alt = `QR sync ${endpoint.ip}`

      const ip = document.createElement('div')
      ip.className = 'ip'
      ip.textContent = `${endpoint.ip}:${endpoint.puerto}`

      const url = document.createElement('div')
      url.className = 'url'
      url.textContent = endpoint.url

      caja.append(img, ip, url)
      elementos.syncEndpoints.append(caja)
    }

    elementos.syncInfo.textContent = `Sync WiFi listo · tocá para ver el QR · ${sync.endpoints
      .map((e) => `${e.ip}:${e.puerto}`)
      .join(' · ')}`
  } catch {
    elementos.syncAyudaVacio.textContent = 'No se pudo obtener el estado de sync.'
    elementos.syncAyudaVacio.classList.remove('oculto')
  }
}

function ocultarPreviewPedido() {
  estado.previewPedido = null
  elementos.btnPedidoConfirmar.disabled = true
  elementos.pedidoPanelPreview.classList.add('oculto')
  elementos.pedidosNuevoGrid.classList.add('sin-preview')
  elementos.pedidoPreview.innerHTML = ''
  elementos.pedidoPreviewCodigo.textContent = '—'
  elementos.pedidoPreviewTotal.textContent = '—'
}

function dibujarPreviewPedido(resuelto) {
  estado.previewPedido = resuelto
  elementos.btnPedidoConfirmar.disabled = !(resuelto?.codigo && resuelto.lineas.length && !resuelto.errores.length)

  if (!resuelto?.codigo) {
    ocultarPreviewPedido()
    return
  }

  elementos.pedidoPanelPreview.classList.remove('oculto')
  elementos.pedidosNuevoGrid.classList.remove('sin-preview')
  elementos.pedidoPreviewCodigo.textContent = resuelto.codigo
  elementos.pedidoPreviewTotal.textContent = formatearPesos(resuelto.total)

  const lineasHtml = resuelto.lineas
    .map((linea) => {
      const nombre = linea.producto
        ? etiquetaProducto(linea.producto)
        : `Producto #${linea.indice} (no encontrado)`
      const subtotal = linea.producto ? subtotalLinea(linea.producto, linea.cantidad) : 0
      const stock = linea.producto != null ? `Stock actual: ${linea.producto.stock}` : 'Sin stock en catálogo'
      const promo =
        linea.producto && linea.cantidad >= 2 && linea.producto.precioCaja != null
          ? ` · promo ${formatearPesos(precioUnitario(linea.producto, linea.cantidad))} c/u`
          : ''
      return `<div class="pedido-linea">
        <span class="cant">${linea.cantidad}</span>
        <div>
          <div class="nombre">${nombre}</div>
          <span class="stock-meta">${stock}${promo}</span>
        </div>
        <span class="subtotal">${formatearPesos(subtotal)}</span>
      </div>`
    })
    .join('')

  const alerta = resuelto.errores.length
    ? `<div class="pedido-alerta">${resuelto.errores.join(' · ')}</div>`
    : ''

  elementos.pedidoPreview.innerHTML = `${lineasHtml}${alerta}`
}

function tarjetaPedido(item, opciones = {}) {
  const li = document.createElement('li')
  li.className = `pedido-card${item.estado === 'anulado' ? ' estado-anulado' : ''}`

  const estadoLabel = opciones.pendiente
    ? 'pendiente'
    : item.estado === 'anulado'
      ? 'anulado'
      : 'confirmado'

  const items = (item.items || [])
    .map((i) => `<li>${i.cantidad} × ${i.nombre}</li>`)
    .join('')

  const info = document.createElement('div')
  info.className = 'pedido-card-info'
  info.innerHTML = `
    <div class="pedido-card-top">
      <span class="codigo">${item.codigo}</span>
      <span class="total">${formatearPesos(item.total)}</span>
      <span class="pedido-estado ${estadoLabel}">${estadoLabel}</span>
    </div>
    <ul class="pedido-items">${items || '<li>Sin ítems</li>'}</ul>
    <div class="pedido-fecha">${new Date(item.fecha).toLocaleString('es-AR')}${
      item.origen ? ` · ${item.origen}` : ''
    }</div>
  `

  const acciones = document.createElement('div')
  acciones.className = 'acciones-item'

  if (opciones.pendiente) {
    const btnOk = document.createElement('button')
    btnOk.type = 'button'
    btnOk.className = 'boton primario compacto'
    btnOk.textContent = 'Confirmar'
    btnOk.addEventListener('click', () => void confirmarDesdePendiente(item.id))

    const btnNo = document.createElement('button')
    btnNo.type = 'button'
    btnNo.className = 'boton fantasma compacto'
    btnNo.textContent = 'Descartar'
    btnNo.addEventListener('click', () => void descartarPendienteUi(item.id))

    acciones.append(btnOk, btnNo)
  } else if (item.estado === 'confirmado') {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'boton fantasma compacto'
    btn.textContent = 'Anular'
    btn.title = 'Devuelve el stock'
    btn.addEventListener('click', () => void anularPedidoUi(item.id))
    acciones.append(btn)
  }

  li.append(info, acciones)
  return li
}

function dibujarPedidos() {
  const { pendientes, historial } = estado.pedidos
  elementos.pedidoCountPen.textContent = String(pendientes.length)
  elementos.pedidoCountHist.textContent = String(historial.length)
  elementos.pedidoPendientes.innerHTML = ''
  elementos.pedidoHistorial.innerHTML = ''

  if (!pendientes.length) {
    const vacio = document.createElement('li')
    vacio.className = 'meta-vacio'
    vacio.textContent = 'No hay pendientes del celular.'
    elementos.pedidoPendientes.append(vacio)
  } else {
    for (const item of pendientes) {
      elementos.pedidoPendientes.append(tarjetaPedido(item, { pendiente: true }))
    }
  }

  if (!historial.length) {
    const vacio = document.createElement('li')
    vacio.className = 'meta-vacio'
    vacio.textContent = 'Todavía no hay pedidos confirmados.'
    elementos.pedidoHistorial.append(vacio)
  } else {
    for (const item of historial.slice(0, 60)) {
      elementos.pedidoHistorial.append(tarjetaPedido(item))
    }
  }
}

async function cargarPedidos() {
  estado.pedidos = await window.panel.leerPedidos()
  dibujarPedidos()
}

function enVistaPedidos() {
  return !elementos.vistaPedidos.classList.contains('oculto')
}

function activarTabPedido(tab) {
  for (const boton of elementos.pedidosTabs.querySelectorAll('.pedidos-tab')) {
    boton.classList.toggle('activa', boton.dataset.tab === tab)
  }
  for (const panel of elementos.vistaPedidos.querySelectorAll('.pedidos-tab-panel')) {
    panel.classList.toggle('activa', panel.dataset.panel === tab)
  }
}

async function mostrarPedidos() {
  elementos.vistaCatalogo.classList.add('oculto')
  elementos.vistaPedidos.classList.remove('oculto')
  elementos.btnPedidos.classList.add('activo-nav')
  activarTabPedido('nuevo')
  ocultarPreviewPedido()
  await cargarPedidos()
}

function volverCatalogo() {
  elementos.vistaPedidos.classList.add('oculto')
  elementos.vistaCatalogo.classList.remove('oculto')
  elementos.btnPedidos.classList.remove('activo-nav')
}

async function leerCodigoPedido() {
  const texto = elementos.pedidoTexto.value
  const resuelto = parsearPedido(texto, estado.catalogo.productos)
  dibujarPreviewPedido(resuelto)
  if (resuelto.errores.length) avisar(resuelto.errores[0], 'error')
}

async function confirmarPedidoPegado() {
  try {
    if (estado.sucio && !(await guardar())) return
    const resultado = await window.panel.confirmarPedido({
      texto: elementos.pedidoTexto.value,
      origen: 'panel',
    })
    estado.catalogo = resultado.catalogo
    estado.pedidos = resultado.pedidos
    elementos.pedidoTexto.value = ''
    ocultarPreviewPedido()
    marcarSucio(false)
    dibujarLista()
    dibujarPedidos()
    const extra = resultado.avisos?.length ? ` · ${resultado.avisos.join(' · ')}` : ''
    avisar(`Pedido ${resultado.registro.codigo} confirmado${extra}`, 'exito')
  } catch (error) {
    avisar(error.message || 'No se pudo confirmar', 'error')
  }
}

async function confirmarDesdePendiente(id) {
  try {
    if (estado.sucio && !(await guardar())) return
    const resultado = await window.panel.confirmarPedido({ pendienteId: id, origen: 'celular' })
    estado.catalogo = resultado.catalogo
    estado.pedidos = resultado.pedidos
    marcarSucio(false)
    dibujarLista()
    dibujarPedidos()
    avisar(`Pedido ${resultado.registro.codigo} confirmado`, 'exito')
  } catch (error) {
    avisar(error.message || 'No se pudo confirmar', 'error')
  }
}

async function descartarPendienteUi(id) {
  if (!confirm('¿Descartar este pendiente sin descontar stock?')) return
  estado.pedidos = await window.panel.descartarPendiente(id)
  dibujarPedidos()
  avisar('Pendiente descartado')
}

async function anularPedidoUi(id) {
  if (!confirm('¿Anular y devolver el stock de este pedido?')) return
  try {
    if (estado.sucio && !(await guardar())) return
    const resultado = await window.panel.anularPedido(id)
    estado.catalogo = resultado.catalogo
    estado.pedidos = resultado.pedidos
    marcarSucio(false)
    dibujarLista()
    dibujarPedidos()
    avisar('Pedido anulado · stock devuelto', 'exito')
  } catch (error) {
    avisar(error.message || 'No se pudo anular', 'error')
  }
}

async function iniciar() {
  try {
    estado.catalogo = await window.panel.leerCatalogo()
    marcarSucio(false)
    dibujarLista()
  } catch (error) {
    elementos.estadoArchivo.textContent = 'No se pudo leer productos.json'
    avisar(`Error al leer el catálogo: ${error.message}`, 'error')
  }

  try {
    await cargarPedidos()
  } catch {
    // historial vacío al inicio está bien
  }

  try {
    const sync = await window.panel.estadoSync()
    if (sync.ips?.length) {
      elementos.syncInfo.textContent = `Sync WiFi listo · tocá para ver el QR · ${sync.ips
        .map((ip) => `${ip}:${sync.puerto}`)
        .join(' · ')}`
    } else {
      elementos.syncInfo.textContent = `Sync WiFi en puerto ${sync.puerto} (sin IP de red detectada)`
    }
  } catch {
    elementos.syncInfo.textContent = 'Sync WiFi no disponible'
  }

  window.panel.onCatalogoDesdeCelular((catalogo) => {
    estado.catalogo = catalogo
    marcarSucio(false)
    if (estado.seleccionId) {
      const sigue = estado.catalogo.productos.some((producto) => producto.id === estado.seleccionId)
      if (sigue) seleccionar(estado.seleccionId)
      else {
        estado.seleccionId = null
        elementos.formulario.classList.add('oculto')
        elementos.editorVacio.classList.remove('oculto')
      }
    }
    dibujarLista()
    avisar(`Sincronizado desde el celular · ${catalogo.productos.length} productos`, 'exito')
  })

  window.panel.onPedidosActualizados((pedidos) => {
    estado.pedidos = pedidos
    dibujarPedidos()
    if (enVistaPedidos()) {
      avisar('Nuevo pedido pendiente del celular', 'exito')
    } else {
      avisar('Llegó un pedido del celular · abrí Pedidos', 'exito')
    }
  })
}

async function sugerirDatos(forzarIa = false) {
  const producto = productoActual()
  if (!producto) {
    avisar('Abrí o creá un vino primero.', 'error')
    return
  }

  leerFormulario()
  const campos = elementos.formulario.elements
  const codigo = campos.codigoBarras.value.trim()
  const nombre = campos.nombre.value.trim()
  const bodega = campos.bodega.value.trim()

  if (!forzarIa && !codigo && !nombre && !bodega) {
    avisar('Cargá el código de barras o al menos el nombre / bodega.', 'error')
    return
  }
  if (forzarIa && !nombre && !bodega && !codigo) {
    avisar('Para la IA hace falta el nombre (o bodega + variedad).', 'error')
    return
  }

  avisar(forzarIa ? 'Consultando IA…' : 'Buscando datos…', 'exito')
  try {
    const resultado = await window.panel.sugerirProducto({
      codigoBarras: codigo,
      nombre,
      bodega,
      variedad: campos.variedad.value.trim(),
      tipo: campos.tipo.value,
      forzarIa,
    })

    if (resultado.error || resultado.ok === false) {
      throw new Error(resultado.error || resultado.aviso || 'No se pudieron sugerir datos')
    }

    const s = resultado.sugerencia || {}
    const vacio = (valor) => valor == null || valor === '' || (Array.isArray(valor) && !valor.length)

    if (s.nombre && vacio(producto.nombre)) campos.nombre.value = s.nombre
    if (s.bodega && vacio(producto.bodega)) campos.bodega.value = s.bodega
    if (s.tipo) campos.tipo.value = s.tipo
    if (s.variedad && vacio(producto.variedad)) campos.variedad.value = s.variedad
    if (s.anio != null && vacio(producto.anio)) campos.anio.value = s.anio
    if (s.region && vacio(producto.region)) campos.region.value = s.region
    if (s.volumenMl && (!producto.volumenMl || producto.volumenMl === 750)) {
      campos.volumenMl.value = s.volumenMl
    }
    if (s.graduacion != null && vacio(producto.graduacion)) campos.graduacion.value = s.graduacion
    if (s.descripcion && vacio(producto.descripcion)) campos.descripcion.value = s.descripcion
    if (s.notas?.length && vacio(producto.notas)) campos.notas.value = s.notas.join(', ')
    if (s.maridaje && vacio(producto.maridaje)) campos.maridaje.value = s.maridaje
    if (s.codigoBarras && vacio(producto.codigoBarras)) campos.codigoBarras.value = s.codigoBarras

    leerFormulario()
    dibujarLista()
    const fuentes = (resultado.fuentes || []).join(' + ') || 'ok'
    avisar(`Datos sugeridos (${fuentes}). Revisá y guardá. ${resultado.aviso || ''}`.trim(), 'exito')
  } catch (error) {
    avisar(error instanceof Error ? error.message : 'No se pudieron sugerir datos', 'error')
  }
}

elementos.formulario.addEventListener('input', leerFormulario)
elementos.formulario.addEventListener('submit', (evento) => evento.preventDefault())
elementos.buscador.addEventListener('input', dibujarLista)
$('#btn-nuevo').addEventListener('click', nuevo)
$('#btn-eliminar').addEventListener('click', eliminar)
$('#btn-sugerir-codigo').addEventListener('click', () => void sugerirDatos(false))
$('#btn-sugerir-ia').addEventListener('click', () => void sugerirDatos(true))
$('#btn-guardar').addEventListener('click', guardar)
$('#btn-guardar-editor').addEventListener('click', guardar)
$('#btn-guardar-abajo').addEventListener('click', guardar)
$('#btn-foto').addEventListener('click', () => void elegirFoto())
$('#btn-quitar-fondo').addEventListener('click', () => void quitarFondoFotoActual())
$('#btn-quitar-foto').addEventListener('click', () => {
  const producto = productoActual()
  if (!producto) return
  producto.imagen = ''
  void dibujarFoto(producto)
  marcarSucio(true)
})
$('#btn-vista-previa').addEventListener('click', () => window.panel.vistaPrevia())
$('#btn-pedidos').addEventListener('click', () => void mostrarPedidos())
$('#btn-sync').addEventListener('click', () => void mostrarSync())
elementos.syncInfo.addEventListener('click', () => void mostrarSync())
$('#btn-cerrar-sync').addEventListener('click', () => elementos.capaSync.classList.add('oculto'))
$('#btn-cerrar-pedidos').addEventListener('click', volverCatalogo)
elementos.pedidosTabs.addEventListener('click', (evento) => {
  const boton = evento.target.closest('.pedidos-tab')
  if (boton) activarTabPedido(boton.dataset.tab)
})
$('#btn-pedido-leer').addEventListener('click', () => void leerCodigoPedido())
elementos.btnPedidoConfirmar.addEventListener('click', () => void confirmarPedidoPegado())
$('#btn-publicar').addEventListener('click', () => {
  elementos.logPublicar.classList.add('oculto')
  elementos.capaPublicar.classList.remove('oculto')
})
$('#btn-cancelar-publicar').addEventListener('click', () => elementos.capaPublicar.classList.add('oculto'))
elementos.btnConfirmarPublicar.addEventListener('click', publicar)

window.addEventListener('keydown', (evento) => {
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
    evento.preventDefault()
    guardar()
  }
})

window.addEventListener('beforeunload', (evento) => {
  if (estado.sucio) evento.preventDefault()
})

iniciar()
