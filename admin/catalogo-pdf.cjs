const { BrowserWindow, dialog, app } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const MARCA = {
  nombre: 'Vinos de Remate',
  lema: 'Cada botella · Una oportunidad',
  aclaracion: 'Precios en pesos argentinos. Sujetos a stock. Solo consumidor final.',
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatearPesos(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0)
}

function productosDisponibles(catalogo) {
  return (catalogo?.productos || [])
    .filter((p) => p.activo !== false && (Number(p.stock) || 0) > 0)
    .sort((a, b) => {
      const porNombre = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
      if (porNombre !== 0) return porNombre
      return String(a.variedad || '').localeCompare(String(b.variedad || ''), 'es')
    })
}

function metaProducto(producto) {
  return [producto.variedad, producto.anio, producto.volumenMl ? `${producto.volumenMl} ml` : '']
    .filter(Boolean)
    .join(' · ')
}

function armarHtml(productos) {
  const filas = productos
    .map((producto) => {
      const oferta =
        producto.precioAnterior != null && Number(producto.precioAnterior) > Number(producto.precio)
          ? `<span class="antes">${escaparHtml(formatearPesos(producto.precioAnterior))}</span>`
          : ''
      return `
      <tr>
        <td class="nombre">
          <strong>${escaparHtml(producto.nombre || 'Sin nombre')}</strong>
          <span class="meta">${escaparHtml(metaProducto(producto))}</span>
        </td>
        <td class="tipo">${escaparHtml(producto.tipo || '')}</td>
        <td class="stock">${escaparHtml(String(Number(producto.stock) || 0))}</td>
        <td class="precio">${oferta}<strong>${escaparHtml(formatearPesos(producto.precio))}</strong></td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escaparHtml(MARCA.nombre)} · Catálogo</title>
  <style>
    @page { margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #f7f1e8;
      background: #0e0a0c;
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .hoja {
      min-height: 100%;
      padding: 0;
      background:
        radial-gradient(90% 55% at 0% 0%, rgba(127, 29, 46, 0.28), transparent 55%),
        radial-gradient(70% 40% at 100% 0%, rgba(212, 175, 83, 0.10), transparent 50%),
        #0e0a0c;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(212, 175, 83, 0.35);
      margin-bottom: 14px;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .copa {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(212, 175, 83, 0.4);
      background: rgba(212, 175, 83, 0.08);
      color: #d4af53;
      display: grid;
      place-items: center;
    }
    .copa svg { width: 18px; height: 18px; }
    .marca h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 650;
      letter-spacing: 0.02em;
      color: #f7f1e8;
    }
    .marca p {
      margin: 3px 0 0;
      color: #d4af53;
      font-size: 11px;
    }
    .resumen {
      display: flex;
      gap: 18px;
      margin-bottom: 12px;
      color: #b0a29c;
      font-size: 10px;
    }
    .resumen span { color: #f7f1e8; font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      text-align: left;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #d4af53;
      font-weight: 600;
      padding: 0 8px 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    thead th.stock,
    thead th.precio { text-align: right; padding-right: 0; }
    thead th.tipo { width: 16%; }
    thead th.stock { width: 12%; }
    thead th.precio { width: 18%; }
    tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    tbody td {
      padding: 8px 8px 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      vertical-align: top;
    }
    tbody tr:nth-child(even) td {
      background: rgba(255,255,255,0.015);
    }
    .nombre strong {
      display: block;
      font-size: 12px;
      font-weight: 650;
      color: #f7f1e8;
    }
    .nombre .meta {
      display: block;
      margin-top: 2px;
      color: #b0a29c;
      font-size: 10px;
    }
    .tipo { color: #b0a29c; }
    .stock {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 650;
      color: #f7f1e8;
    }
    .precio {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .precio strong {
      display: block;
      color: #d4af53;
      font-size: 12px;
      font-weight: 700;
    }
    .precio .antes {
      display: block;
      color: #8a7c76;
      font-size: 9px;
      text-decoration: line-through;
      margin-bottom: 1px;
    }
    footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: #8a7c76;
      font-size: 9px;
      line-height: 1.45;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    footer .wa { color: #b0a29c; }
  </style>
</head>
<body>
  <div class="hoja">
    <header>
      <div class="marca">
        <div class="copa" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 4h10l-1 8a4 4 0 0 1-8 0Z" />
            <path d="M12 12v5" />
            <path d="M9 17h6" />
          </svg>
        </div>
        <div>
          <h1>${escaparHtml(MARCA.nombre)}</h1>
          <p>${escaparHtml(MARCA.lema)}</p>
        </div>
      </div>
    </header>

    <div class="resumen">
      <div><span>${productos.length}</span> productos con stock</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th class="tipo">Tipo</th>
          <th class="stock">Stock</th>
          <th class="precio">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>

    <footer>
      <div>${escaparHtml(MARCA.aclaracion)}</div>
      <div class="wa">Pedidos por WhatsApp</div>
    </footer>
  </div>
</body>
</html>`
}

/**
 * Genera un PDF del catálogo (solo productos activos con stock > 0)
 * y pide dónde guardarlo.
 */
async function exportarCatalogoPdf({ catalogo, ventanaPadre = null } = {}) {
  const productos = productosDisponibles(catalogo)
  if (productos.length === 0) {
    throw new Error('No hay productos con stock para incluir en el PDF.')
  }

  const html = armarHtml(productos)
  const stamp = new Date().toISOString().slice(0, 10)
  const elegido = await dialog.showSaveDialog(ventanaPadre || undefined, {
    title: 'Guardar catálogo PDF',
    defaultPath: path.join(app.getPath('desktop'), `Vinos-de-Remate-catalogo-${stamp}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (elegido.canceled || !elegido.filePath) {
    return { cancelado: true }
  }

  const destino = elegido.filePath.endsWith('.pdf')
    ? elegido.filePath
    : `${elegido.filePath}.pdf`

  const tmpHtml = path.join(app.getPath('temp'), `vinos-catalogo-${Date.now()}.html`)
  await fs.writeFile(tmpHtml, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  })

  try {
    await win.loadFile(tmpHtml)
    // Esperar a que el layout asiente.
    await new Promise((r) => setTimeout(r, 250))

    const pdf = await win.webContents.printToPDF({
      landscape: false,
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top: 0.45,
        bottom: 0.45,
        left: 0.4,
        right: 0.4,
      },
    })

    await fs.writeFile(destino, pdf)
    return { cancelado: false, ruta: destino, productos: productos.length }
  } finally {
    if (!win.isDestroyed()) win.destroy()
    await fs.unlink(tmpHtml).catch(() => {})
  }
}

module.exports = { exportarCatalogoPdf, productosDisponibles }
