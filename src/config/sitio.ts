/**
 * Datos del negocio. Es el único archivo que hay que editar para cambiar
 * nombre, teléfono, textos y redes del catálogo.
 */
export const sitio = {
  nombre: 'Vinos de Remate',
  lema: 'Buenos vinos · Buen precio',

  /** Número de WhatsApp en formato internacional, sin + ni espacios. */
  whatsapp: '5490000000000',
  whatsappVisible: '+54 9 000 000-0000',

  email: '',
  ciudad: 'Argentina',

  instagram: '',
  facebook: '',

  hero: {
    volanta: 'Stock limitado · Pedidos por WhatsApp',
    titulo: 'Buenos vinos,',
    tituloDestacado: 'buen precio',
    subtitulo: 'Catálogo actualizado. Elegí tus botellas, armá el pedido y lo confirmamos por WhatsApp.',
  },

  entrega: {
    titulo: 'Entrega',
    detalle: 'Coordinamos retiro o envío por WhatsApp según el stock del día.',
  },

  /** Se muestra al pie del catálogo. */
  aclaracionPrecios: 'Precios en pesos argentinos. Sujetos a stock. Solo consumidor final.',
} as const
