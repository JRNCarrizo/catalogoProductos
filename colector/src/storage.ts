import { Preferences } from '@capacitor/preferences'
import type { CambioPendiente, Catalogo, Producto } from './types'
import { productoVacio } from './types'

const CLAVE_CATALOGO = 'colector:catalogo'
const CLAVE_CAMBIOS = 'colector:cambios'

const vacio = (): Catalogo => ({
  actualizado: new Date().toISOString(),
  moneda: 'ARS',
  productos: [],
})

function normalizar(catalogo: Catalogo): Catalogo {
  return {
    actualizado: catalogo.actualizado || new Date().toISOString(),
    moneda: catalogo.moneda || 'ARS',
    productos: (catalogo.productos || []).map((producto) =>
      productoVacio({
        ...producto,
        codigoBarras: producto.codigoBarras ?? '',
        notas: producto.notas ?? [],
      }),
    ),
  }
}

export async function leerCatalogo(): Promise<Catalogo> {
  const { value } = await Preferences.get({ key: CLAVE_CATALOGO })
  if (!value) return vacio()
  try {
    return normalizar(JSON.parse(value) as Catalogo)
  } catch {
    return vacio()
  }
}

export async function guardarCatalogo(catalogo: Catalogo): Promise<Catalogo> {
  const siguiente = {
    ...catalogo,
    actualizado: new Date().toISOString(),
  }
  await Preferences.set({ key: CLAVE_CATALOGO, value: JSON.stringify(siguiente) })
  return siguiente
}

export async function leerCambios(): Promise<CambioPendiente[]> {
  const { value } = await Preferences.get({ key: CLAVE_CAMBIOS })
  if (!value) return []
  try {
    return JSON.parse(value) as CambioPendiente[]
  } catch {
    return []
  }
}

async function guardarCambios(cambios: CambioPendiente[]): Promise<void> {
  await Preferences.set({ key: CLAVE_CAMBIOS, value: JSON.stringify(cambios) })
}

export async function registrarCambio(
  tipo: CambioPendiente['tipo'],
  producto: Producto | null,
  productoId: string,
): Promise<void> {
  const cambios = await leerCambios()
  cambios.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo,
    productoId,
    producto,
    fecha: new Date().toISOString(),
  })
  await guardarCambios(cambios)
}

export async function importarCatalogoRemoto(url: string): Promise<Catalogo> {
  const respuesta = await fetch(`${url}?v=${Date.now()}`)
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  const datos = (await respuesta.json()) as Catalogo
  const catalogo = normalizar(datos)
  await Preferences.set({ key: CLAVE_CATALOGO, value: JSON.stringify(catalogo) })
  // Al importar desde la web, la cola local se reinicia: es el punto de partida.
  await Preferences.set({ key: CLAVE_CAMBIOS, value: '[]' })
  return catalogo
}

export async function vaciarCambios(): Promise<void> {
  await Preferences.set({ key: CLAVE_CAMBIOS, value: '[]' })
}

const CLAVE_PC = 'colector:ip-pc'

export async function leerIpPc(): Promise<string> {
  const { value } = await Preferences.get({ key: CLAVE_PC })
  return value || ''
}

export async function guardarIpPc(ip: string): Promise<void> {
  await Preferences.set({ key: CLAVE_PC, value: ip.trim() })
}

/** Extrae host[:puerto] desde IP cruda, URL http o texto de QR. */
export function parsearHostSync(entrada: string): string | null {
  const bruto = entrada.trim()
  if (!bruto) return null

  try {
    if (bruto.includes('://')) {
      const url = new URL(bruto)
      return url.port && url.port !== '3847' ? `${url.hostname}:${url.port}` : url.hostname
    }
  } catch {
    // sigue con heurística
  }

  const limpio = bruto.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(limpio) || limpio.includes('.')) {
    return limpio
  }
  return null
}

export async function sincronizarConPc(opciones: {
  host: string
  puerto?: number
  reemplazarTodo?: boolean
}): Promise<{ productos: number; modo: string }> {
  const host = opciones.host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const puerto = opciones.puerto ?? 3847
  const base = `http://${host.includes(':') ? host : `${host}:${puerto}`}`

  const [catalogo, cambios] = await Promise.all([leerCatalogo(), leerCambios()])

  const cuerpo = opciones.reemplazarTodo
    ? { reemplazarTodo: true, catalogo }
    : cambios.length > 0
      ? { cambios, catalogo }
      : { catalogo }

  const respuesta = await fetch(`${base}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })

  const datos = (await respuesta.json()) as { ok: boolean; error?: string; productos?: number; modo?: string }
  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || `No se pudo sincronizar (HTTP ${respuesta.status})`)
  }

  await vaciarCambios()
  await guardarIpPc(host.replace(/^https?:\/\//, '').replace(/\/$/, ''))
  return { productos: datos.productos ?? catalogo.productos.length, modo: datos.modo || 'ok' }
}

export async function probarPc(host: string, puerto = 3847): Promise<{ productos: number; servicio: string }> {
  const limpio = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = `http://${limpio.includes(':') ? limpio : `${limpio}:${puerto}`}`
  const respuesta = await fetch(`${base}/api/estado`)
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  const datos = (await respuesta.json()) as { ok: boolean; productos?: number; servicio?: string }
  if (!datos.ok) throw new Error('El panel no respondió bien')
  return { productos: datos.productos ?? 0, servicio: datos.servicio || 'Panel PC' }
}

export type PedidoLocalPendiente = {
  id: string
  codigo: string
  fecha: string
}

const CLAVE_PEDIDOS = 'colector:pedidos-pendientes'

export async function leerPedidosLocales(): Promise<PedidoLocalPendiente[]> {
  const { value } = await Preferences.get({ key: CLAVE_PEDIDOS })
  if (!value) return []
  try {
    const lista = JSON.parse(value) as PedidoLocalPendiente[]
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

async function guardarPedidosLocales(lista: PedidoLocalPendiente[]): Promise<void> {
  await Preferences.set({ key: CLAVE_PEDIDOS, value: JSON.stringify(lista) })
}

/** Guarda un pedido en el celu (offline). Si el mismo código ya estaba, no duplica. */
export async function guardarPedidoLocal(codigo: string): Promise<{ yaEstaba: boolean; lista: PedidoLocalPendiente[] }> {
  const limpio = codigo.trim()
  const lista = await leerPedidosLocales()
  if (lista.some((p) => p.codigo === limpio)) {
    return { yaEstaba: true, lista }
  }
  lista.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    codigo: limpio,
    fecha: new Date().toISOString(),
  })
  await guardarPedidosLocales(lista)
  return { yaEstaba: false, lista }
}

export async function quitarPedidoLocal(codigo: string): Promise<PedidoLocalPendiente[]> {
  const lista = (await leerPedidosLocales()).filter((p) => p.codigo !== codigo.trim())
  await guardarPedidosLocales(lista)
  return lista
}

export async function vaciarPedidosLocales(): Promise<void> {
  await Preferences.set({ key: CLAVE_PEDIDOS, value: '[]' })
}

/** Envía el código de pedido al panel (queda pendiente; no descuenta stock). */
export async function enviarPedidoAPc(host: string, texto: string, puerto = 3847): Promise<{ yaEstaba: boolean }> {
  const limpio = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const base = `http://${limpio.includes(':') ? limpio : `${limpio}:${puerto}`}`
  const respuesta = await fetch(`${base}/api/pedido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, origen: 'celular' }),
  })
  const datos = (await respuesta.json()) as { ok: boolean; error?: string; yaEstaba?: boolean }
  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || `No se pudo enviar el pedido (HTTP ${respuesta.status})`)
  }
  await guardarIpPc(limpio)
  // Si estaba en la cola offline del celu, ya no hace falta.
  await quitarPedidoLocal(texto.trim())
  return { yaEstaba: Boolean(datos.yaEstaba) }
}

/** Intenta mandar todos los pedidos guardados en el celu. Los exitosos se borran de la cola. */
export async function enviarPedidosLocalesAPc(
  host: string,
  puerto = 3847,
): Promise<{ enviados: number; yaEstaban: number; fallidos: { codigo: string; error: string }[]; quedan: number }> {
  const lista = await leerPedidosLocales()
  let enviados = 0
  let yaEstaban = 0
  const fallidos: { codigo: string; error: string }[] = []

  for (const pedido of lista) {
    try {
      const r = await enviarPedidoAPc(host, pedido.codigo, puerto)
      if (r.yaEstaba) yaEstaban += 1
      else enviados += 1
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error'
      // Si ya fue confirmado en el panel, no tiene sentido dejarlo en la cola local.
      if (msg.includes('ya fue confirmado')) {
        await quitarPedidoLocal(pedido.codigo)
        yaEstaban += 1
      } else {
        fallidos.push({ codigo: pedido.codigo, error: msg })
      }
    }
  }

  const quedan = (await leerPedidosLocales()).length
  return { enviados, yaEstaban, fallidos, quedan }
}

export async function exportarJson(catalogo: Catalogo): Promise<string> {
  return JSON.stringify(catalogo, null, 2)
}
