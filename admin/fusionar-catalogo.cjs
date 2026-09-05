/**
 * Une dos catálogos por id de producto.
 * `preferido` gana en campos (stock, precio, etc.); la imagen no vacía se conserva.
 */
function fusionarCatalogos(base, preferido) {
  const byId = new Map()

  for (const p of base?.productos || []) {
    if (p?.id) byId.set(p.id, { ...p })
  }

  for (const p of preferido?.productos || []) {
    if (!p?.id) continue
    const actual = byId.get(p.id)
    if (!actual) {
      byId.set(p.id, { ...p })
      continue
    }
    const imagenActual = actual.imagen && String(actual.imagen).trim()
    const imagenNueva = p.imagen && String(p.imagen).trim()
    byId.set(p.id, {
      ...actual,
      ...p,
      imagen: imagenNueva || imagenActual || '',
    })
  }

  return {
    actualizado: new Date().toISOString(),
    moneda: preferido?.moneda || base?.moneda || 'ARS',
    productos: [...byId.values()],
  }
}

module.exports = { fusionarCatalogos }
