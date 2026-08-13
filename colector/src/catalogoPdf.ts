import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { jsPDF } from 'jspdf'
import { estaActivo, precio, type Producto } from './types'

const MARCA = {
  nombre: 'Vinos de Remate',
  lema: 'Cada botella · Una oportunidad',
  aclaracion: 'Precios en pesos argentinos. Sujetos a stock. Solo consumidor final.',
}

/** Solo activos con stock > 0, ordenados para el catálogo. */
export function productosParaCatalogo(productos: Producto[]): Producto[] {
  return productos
    .filter((p) => estaActivo(p) && (Number(p.stock) || 0) > 0)
    .sort((a, b) => {
      const porNombre = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
      if (porNombre !== 0) return porNombre
      return String(a.variedad || '').localeCompare(String(b.variedad || ''), 'es')
    })
}

function metaProducto(producto: Producto): string {
  return [producto.variedad, producto.anio, producto.volumenMl ? `${producto.volumenMl} ml` : '']
    .filter(Boolean)
    .join(' · ')
}

/**
 * PDF vertical pensado para leer en el celular:
 * tipografía grande, una tarjeta por producto, sin tabla apretada.
 * Título solo en la 1ª hoja; pie solo en la última.
 */
export function armarPdfCatalogoMobile(productos: Producto[]): jsPDF {
  // Ancho tipo hoja angosta (más cómoda al abrir en el celu).
  const pageW = 120
  const pageH = 200
  const margin = 8
  const contentW = pageW - margin * 2

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  })

  const noche = '#0e0a0c'
  const crema = '#f7f1e8'
  const oro = '#d4af53'
  const humo = '#b0a29c'
  const borde = '#2a2226'
  const tarjeta = '#151012'

  const altoTarjeta = 22
  const gap = 2
  const step = altoTarjeta + gap
  const yPrimera = margin + 28
  const ySiguiente = margin + 4
  const yMaxSinPie = pageH - margin - 2
  const yMaxConPie = pageH - 14

  const capacidad = (esPrimera: boolean, conPie: boolean) => {
    const inicio = esPrimera ? yPrimera : ySiguiente
    const fin = conPie ? yMaxConPie : yMaxSinPie
    return Math.max(1, Math.floor((fin - inicio) / step))
  }

  // Armar páginas: encabezado solo 1ª, pie solo última.
  const paginas: Producto[][] = []
  const cola = [...productos]
  let esPrimera = true
  while (cola.length > 0) {
    const cabenAlFinal = capacidad(esPrimera, true)
    if (cola.length <= cabenAlFinal) {
      paginas.push(cola.splice(0, cola.length))
      break
    }
    const caben = capacidad(esPrimera, false)
    paginas.push(cola.splice(0, caben))
    esPrimera = false
  }

  const pintarFondo = () => {
    doc.setFillColor(noche)
    doc.rect(0, 0, pageW, pageH, 'F')
  }

  const encabezado = () => {
    doc.setTextColor(crema)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(MARCA.nombre, margin, margin + 6)

    doc.setTextColor(oro)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(MARCA.lema, margin, margin + 12)

    doc.setDrawColor(oro)
    doc.setLineWidth(0.3)
    doc.line(margin, margin + 16, pageW - margin, margin + 16)

    doc.setTextColor(humo)
    doc.setFontSize(8)
    doc.text(`${productos.length} productos con stock`, margin, margin + 22)
  }

  const pie = () => {
    doc.setDrawColor(borde)
    doc.setLineWidth(0.2)
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10)
    doc.setTextColor(humo)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(MARCA.aclaracion, margin, pageH - 5, { maxWidth: contentW })
  }

  const dibujarProducto = (producto: Producto, y: number) => {
    doc.setFillColor(tarjeta)
    doc.setDrawColor(borde)
    doc.setLineWidth(0.25)
    doc.roundedRect(margin, y, contentW, altoTarjeta, 2, 2, 'FD')

    const nombre = (producto.nombre || 'Sin nombre').trim()
    const meta = metaProducto(producto)
    const tipo = producto.tipo || ''
    const stock = String(Number(producto.stock) || 0)
    const precioTxt = precio(Number(producto.precio) || 0)
    const precioAnt =
      producto.precioAnterior != null && Number(producto.precioAnterior) > Number(producto.precio)
        ? precio(Number(producto.precioAnterior))
        : ''

    doc.setTextColor(crema)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const nombreLineas = doc.splitTextToSize(nombre, contentW - 40)
    doc.text(nombreLineas.slice(0, 2), margin + 3, y + 6)

    doc.setTextColor(humo)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (meta) doc.text(meta, margin + 3, y + 12)
    doc.text([tipo, `Stock ${stock}`].filter(Boolean).join(' · '), margin + 3, y + 17.5)

    doc.setTextColor(oro)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(precioTxt, pageW - margin - 3, y + 10, { align: 'right' })

    if (precioAnt) {
      doc.setTextColor(humo)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(precioAnt, pageW - margin - 3, y + 15, { align: 'right' })
    }
  }

  paginas.forEach((grupo, indice) => {
    if (indice > 0) doc.addPage()
    pintarFondo()
    const primera = indice === 0
    const ultima = indice === paginas.length - 1
    if (primera) encabezado()
    let y = primera ? yPrimera : ySiguiente
    for (const producto of grupo) {
      dibujarProducto(producto, y)
      y += step
    }
    if (ultima) pie()
  })

  return doc
}

function stampFecha(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Genera el PDF y lo abre en el sheet de compartir del celular (o descarga en PC). */
export async function compartirCatalogoPdf(productos: Producto[]): Promise<{ cantidad: number }> {
  const lista = productosParaCatalogo(productos)
  if (lista.length === 0) {
    throw new Error('No hay productos con stock para el catálogo.')
  }

  const doc = armarPdfCatalogoMobile(lista)
  const fileName = `Vinos-de-Remate-catalogo-${stampFecha()}.pdf`

  if (!Capacitor.isNativePlatform()) {
    doc.save(fileName)
    return { cantidad: lista.length }
  }

  const base64 = doc.output('datauristring').split(',')[1] || ''
  const escrito = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  })

  await Share.share({
    title: MARCA.nombre,
    text: `${MARCA.nombre} · catálogo disponible`,
    url: escrito.uri,
    files: [escrito.uri],
    dialogTitle: 'Compartir catálogo PDF',
  })

  return { cantidad: lista.length }
}
