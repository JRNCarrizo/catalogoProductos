const $ = (selector) => document.querySelector(selector)

const elementos = {
  estadoArchivo: $('#estado-archivo'),
  punto: $('.punto'),
  lista: $('#lista-productos'),
  contador: $('#contador'),
  buscador: $('#buscador'),
  formulario: $('#formulario'),
  editorVacio: $('#editor-vacio'),
  tituloEditor: $('#titulo-editor'),
  fotoVista: $('#foto-vista'),
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

    const nombre = document.createElement('div')
    nombre.className = 'nombre'
    nombre.textContent = producto.nombre || 'Sin nombre'
    if (producto.destacado) {
      const estrella = document.createElement('span')
      estrella.className = 'marca-destacado'
      estrella.textContent = '★'
      nombre.append(estrella)
    }
    if (Number(producto.stock) <= 0) {
      const sinStock = document.createElement('span')
      sinStock.className = 'sin-stock'
      sinStock.textContent = 'sin stock'
      nombre.append(sinStock)
    }

    const meta = document.createElement('span')
    meta.className = 'meta'
    meta.textContent = [producto.bodega, producto.anio, `$${Number(producto.precio).toLocaleString('es-AR')}`]
      .filter(Boolean)
      .join(' · ')

    item.append(nombre, meta)
    item.addEventListener('click', () => seleccionar(producto.id))
    elementos.lista.append(item)
  }

  elementos.contador.textContent = String(estado.catalogo.productos.length)
}

function dibujarFoto(producto) {
  if (producto.imagen) {
    elementos.fotoVista.innerHTML = ''
    const imagen = document.createElement('img')
    imagen.src = `../../public/${producto.imagen}?v=${Date.now()}`
    imagen.alt = ''
    elementos.fotoVista.append(imagen)
  } else {
    elementos.fotoVista.textContent = 'Sin foto'
  }
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
  campos.volumenMl.value = producto.volumenMl ?? 750
  campos.graduacion.value = producto.graduacion ?? ''
  campos.descripcion.value = producto.descripcion ?? ''
  campos.notas.value = (producto.notas ?? []).join(', ')
  campos.maridaje.value = producto.maridaje ?? ''
  campos.destacado.checked = Boolean(producto.destacado)

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
  producto.volumenMl = numeroOpcional(campos.volumenMl.value) ?? 750
  producto.graduacion = numeroOpcional(campos.graduacion.value)
  producto.descripcion = campos.descripcion.value.trim()
  producto.notas = campos.notas.value
    .split(',')
    .map((nota) => nota.trim())
    .filter(Boolean)
  producto.maridaje = campos.maridaje.value.trim()
  producto.destacado = campos.destacado.checked

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

async function elegirFoto() {
  const producto = productoActual()
  if (!producto) return
  if (esProvisorio(producto.id) && producto.nombre) producto.id = generarId(producto)

  const ruta = await window.panel.elegirImagen(producto.id)
  if (!ruta) return

  producto.imagen = ruta
  dibujarFoto(producto)
  marcarSucio(true)
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
  const resultado = await window.panel.publicar(elementos.mensajeCommit.value)
  elementos.logPublicar.textContent = resultado.pasos
    .map(({ paso, salida }) => `› ${paso}\n${salida || 'ok'}`)
    .join('\n\n')
  elementos.btnConfirmarPublicar.disabled = false

  if (resultado.ok) {
    avisar(resultado.sinCambios ? 'No había cambios para publicar' : 'Catálogo publicado', 'exito')
  } else {
    avisar('La publicación falló. Revisá el detalle.', 'error')
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
}

elementos.formulario.addEventListener('input', leerFormulario)
elementos.formulario.addEventListener('submit', (evento) => evento.preventDefault())
elementos.buscador.addEventListener('input', dibujarLista)
$('#btn-nuevo').addEventListener('click', nuevo)
$('#btn-eliminar').addEventListener('click', eliminar)
$('#btn-guardar').addEventListener('click', guardar)
$('#btn-foto').addEventListener('click', elegirFoto)
$('#btn-quitar-foto').addEventListener('click', () => {
  const producto = productoActual()
  if (!producto) return
  producto.imagen = ''
  dibujarFoto(producto)
  marcarSucio(true)
})
$('#btn-vista-previa').addEventListener('click', () => window.panel.vistaPrevia())
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
