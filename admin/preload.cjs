const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('panel', {
  leerCatalogo: () => ipcRenderer.invoke('catalogo:leer'),
  guardarCatalogo: (catalogo) => ipcRenderer.invoke('catalogo:guardar', catalogo),
  elegirImagen: (idProducto) => ipcRenderer.invoke('imagen:elegir', idProducto),
  vistaPrevia: () => ipcRenderer.invoke('sitio:vistaPrevia'),
  publicar: (mensaje) => ipcRenderer.invoke('sitio:publicar', mensaje),
  estadoSync: () => ipcRenderer.invoke('sync:estado'),
  leerPedidos: () => ipcRenderer.invoke('pedidos:leer'),
  previsualizarPedido: (texto) => ipcRenderer.invoke('pedidos:previsualizar', texto),
  confirmarPedido: (payload) => ipcRenderer.invoke('pedidos:confirmar', payload),
  descartarPendiente: (id) => ipcRenderer.invoke('pedidos:descartar', id),
  anularPedido: (id) => ipcRenderer.invoke('pedidos:anular', id),
  sugerirProducto: (entrada) => ipcRenderer.invoke('sugerencias:producto', entrada),
  estadoSugerencias: () => ipcRenderer.invoke('sugerencias:estado'),
  onCatalogoDesdeCelular: (callback) => {
    const handler = (_evento, catalogo) => callback(catalogo)
    ipcRenderer.on('catalogo:desde-celular', handler)
    return () => ipcRenderer.removeListener('catalogo:desde-celular', handler)
  },
  onPedidosActualizados: (callback) => {
    const handler = (_evento, pedidos) => callback(pedidos)
    ipcRenderer.on('pedidos:actualizados', handler)
    return () => ipcRenderer.removeListener('pedidos:actualizados', handler)
  },
})
