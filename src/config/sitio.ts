/**
 * Datos del negocio y vitrinas (WhatsApp por vendedor).
 * Un solo catálogo; cada link usa su propio WhatsApp.
 *
 * Links:
 *   /         → Jorge (principal)
 *   /leandro  → Leandro E.
 */
export type VendedorId = 'jorge' | 'leandro'

export interface Vendedor {
  id: VendedorId
  /** Segmento de URL. Vacío = raíz del sitio. */
  slug: string
  /** Nombre corto para mensajes / pie (opcional). */
  nombreCorto: string
  /** Número WhatsApp internacional, sin + ni espacios. */
  whatsapp: string
  whatsappVisible: string
}

export const vendedores: Record<VendedorId, Vendedor> = {
  jorge: {
    id: 'jorge',
    slug: '',
    nombreCorto: 'Jorge',
    whatsapp: '5491138332282',
    whatsappVisible: '+54 9 11 3833-2282',
  },
  leandro: {
    id: 'leandro',
    slug: 'leandro',
    nombreCorto: 'Leandro E.',
    whatsapp: '5491162373083',
    whatsappVisible: '+54 9 11 6237-3083',
  },
}

/** Marca y textos compartidos por todas las vitrinas. */
export const sitioBase = {
  nombre: 'Vinos de Remate',
  lema: 'Cada botella · Una oportunidad',

  email: '',
  ciudad: 'Argentina',

  instagram: '',
  facebook: '',

  hero: {
    volanta: 'Stock limitado · Pedidos por WhatsApp',
    titulo: 'El vino que querés,',
    tituloDestacado: 'al precio que merecés',
    subtitulo:
      'Catálogo actualizado. Elegí tus botellas, armá el pedido y lo confirmamos por WhatsApp.',
    /** Foto de portada: poné el archivo en public/img/portada.jpg (o .webp / .png). */
    imagen: 'img/portada2.png',
  },

  entrega: {
    titulo: 'Entrega',
    detalle: 'Coordinamos retiro o envío por WhatsApp según el stock del día.',
  },

  /** Se muestra al pie del catálogo. */
  aclaracionPrecios: 'Precios en pesos argentinos. Sujetos a stock. Solo consumidor final.',
} as const

export type SitioActivo = typeof sitioBase & Vendedor

/** Compat: muchos archivos importan `sitio` (vitrina principal de Jorge). */
export const sitio: SitioActivo = { ...sitioBase, ...vendedores.jorge }

export function resolverVendedor(pathname: string): Vendedor {
  const limpio = pathname.replace(/\/+$/, '').toLowerCase() || '/'
  if (limpio === '/leandro' || limpio === '/l/leandro') return vendedores.leandro
  return vendedores.jorge
}

export function sitioDesdeRuta(pathname?: string): SitioActivo {
  const ruta =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  return { ...sitioBase, ...resolverVendedor(ruta) }
}

/** Ruta pública de una vitrina (para compartir el link). */
export function rutaVendedor(id: VendedorId): string {
  const v = vendedores[id]
  return v.slug ? `/${v.slug}` : '/'
}
