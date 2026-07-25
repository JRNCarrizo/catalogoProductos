const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('panel', {
  leerCatalogo: () => ipcRenderer.invoke('catalogo:leer'),
  guardarCatalogo: (catalogo) => ipcRenderer.invoke('catalogo:guardar', catalogo),
  elegirImagen: (idProducto) => ipcRenderer.invoke('imagen:elegir', idProducto),
  vistaPrevia: () => ipcRenderer.invoke('sitio:vistaPrevia'),
  publicar: (mensaje) => ipcRenderer.invoke('sitio:publicar', mensaje),
  estadoSync: () => ipcRenderer.invoke('sync:estado'),
  onCatalogoDesdeCelular: (callback) => {
    const handler = (_evento, catalogo) => callback(catalogo)
    ipcRenderer.on('catalogo:desde-celular', handler)
    return () => ipcRenderer.removeListener('catalogo:desde-celular', handler)
  },
})
