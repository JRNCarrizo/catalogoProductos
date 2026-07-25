import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ItemCarrito, Producto } from '../types'

const CLAVE = 'catalogo-vinos:carrito'

interface Guardado {
  id: string
  cantidad: number
}

function leerGuardado(): Guardado[] {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (!bruto) return []
    const datos: unknown = JSON.parse(bruto)
    if (!Array.isArray(datos)) return []
    return datos.filter(
      (item): item is Guardado =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Guardado).id === 'string' &&
        typeof (item as Guardado).cantidad === 'number',
    )
  } catch {
    return []
  }
}

export function useCarrito(productos: Producto[]) {
  const [cantidades, setCantidades] = useState<Map<string, number>>(new Map())
  const [hidratado, setHidratado] = useState(false)

  // Se rehidrata cuando llegan los productos: así se descartan los que ya no existen.
  useEffect(() => {
    if (hidratado || productos.length === 0) return
    const disponibles = new Set(productos.map((producto) => producto.id))
    const inicial = new Map<string, number>()
    for (const { id, cantidad } of leerGuardado()) {
      if (disponibles.has(id) && cantidad > 0) inicial.set(id, cantidad)
    }
    setCantidades(inicial)
    setHidratado(true)
  }, [productos, hidratado])

  useEffect(() => {
    if (!hidratado) return
    const datos: Guardado[] = [...cantidades].map(([id, cantidad]) => ({ id, cantidad }))
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  }, [cantidades, hidratado])

  const items = useMemo<ItemCarrito[]>(() => {
    const porId = new Map(productos.map((producto) => [producto.id, producto]))
    return [...cantidades]
      .map(([id, cantidad]) => {
        const producto = porId.get(id)
        return producto ? { producto, cantidad } : null
      })
      .filter((item): item is ItemCarrito => item !== null)
  }, [cantidades, productos])

  const agregar = useCallback((producto: Producto, cantidad = 1) => {
    setCantidades((previo) => {
      const siguiente = new Map(previo)
      const actual = siguiente.get(producto.id) ?? 0
      const tope = producto.stock > 0 ? producto.stock : actual + cantidad
      siguiente.set(producto.id, Math.min(actual + cantidad, tope))
      return siguiente
    })
  }, [])

  const definirCantidad = useCallback((producto: Producto, cantidad: number) => {
    setCantidades((previo) => {
      const siguiente = new Map(previo)
      if (cantidad <= 0) {
        siguiente.delete(producto.id)
        return siguiente
      }
      const tope = producto.stock > 0 ? producto.stock : cantidad
      siguiente.set(producto.id, Math.min(cantidad, tope))
      return siguiente
    })
  }, [])

  const quitar = useCallback((id: string) => {
    setCantidades((previo) => {
      const siguiente = new Map(previo)
      siguiente.delete(id)
      return siguiente
    })
  }, [])

  const vaciar = useCallback(() => setCantidades(new Map()), [])

  const total = items.reduce((suma, { producto, cantidad }) => suma + producto.precio * cantidad, 0)
  const unidades = items.reduce((suma, { cantidad }) => suma + cantidad, 0)

  return { items, total, unidades, agregar, definirCantidad, quitar, vaciar, cantidades }
}
