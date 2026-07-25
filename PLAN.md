# Plan del proyecto — Vinos de Remate

> Documento de referencia. Si se pierde la conversación con el asistente, acá está
> todo el contexto: qué es el proyecto, qué está hecho, qué decisiones se tomaron
> y cuál es el camino a seguir.
>
> Última actualización: 25/07/2026

---

## 1. Contexto del negocio (importante para entender decisiones)

- Jorge recibe vinos en su trabajo: sobrantes de cajas rotas, perdidas o fuera de sistema.
- Son vinos de calidad y marcas conocidas (ej. Catena Zapata), a veces con etiqueta
  manchada o rota, pero con contenido original.
- Los vende a precio mucho más bajo que en comercio, **solo a consumidor final**
  (no apto para reventa), como complemento del sueldo.
- **Decisión de comunicación:** el catálogo NO explica la procedencia. Es un catálogo
  de venta limpio, sin "palabrerío". La historia de fondo es contexto interno, no
  contenido de la página. Se probó mostrar etiquetas de "presentación imperfecta"
  por producto y se decidió **eliminarlas**: todos los productos se muestran igual.

## 2. Requisitos clave

- **Costo cero**: sin hosting pago, sin servicios pagos.
- Catálogo online compartible por link (responsive, se ve bien en celular).
- Carga/actualización de productos sin tocar código.
- Pedido por WhatsApp (sin medios de pago por ahora).
- Estética profesional, oscura, premium (elegida por Jorge entre 3 opciones).

## 3. Qué está construido (estado actual)

### 3.1 Catálogo web (para el cliente)

- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 (plugin `@tailwindcss/vite`).
- **Datos:** lee `public/data/productos.json` (fetch con cache-buster).
- **Diseño:** oscuro premium; colores vino/negro/dorado; fuentes Cormorant Garamond + Inter.
- **Marca actual:** "Vinos de Remate" — lema "Buenos vinos · Buen precio".
  Todo lo de marca/contacto se edita en `src/config/sitio.ts` (único lugar).
- **Funcionalidad:**
  - Portada (hero) + franja de 3 beneficios + grilla de productos.
  - Filtros: búsqueda, tipo, bodega, orden, "en oferta". Barra sticky bajo el header.
  - Detalle de producto en modal.
  - **Carrito**: agregar NO abre el panel (se sigue navegando). Hay un
    **carrito flotante fijo abajo a la derecha** (cantidad + total + "Ver pedido").
    Botón WhatsApp flotante abajo a la izquierda.
  - El pedido se envía armado por WhatsApp (`src/lib/whatsapp.ts`)
    con un **código corto** al final (`#3x2,7x1` = producto 3×2 + producto 7×1,
    según el orden de `productos.json`).
  - Confirmación de pedido (sin costo):
    1. Cliente manda WhatsApp (texto legible + código).
    2. Vos pegás el mensaje en el **panel → Pedidos** (o en la APK → Pedido
       y “Enviar al panel”).
    3. Comparás con el chat → **Confirmar** → se descuenta stock y queda en
       el historial local (`admin/pedidos.json`).
    4. **Publicar** para que la web muestre el stock nuevo.
    Sin campo de nota (se decidió quitarlo: el chat cumple ese rol).
  - Sin foto → se muestra una botella ilustrada SVG (`BotellaIlustrada.tsx`)
    coloreada según el tipo de vino.
  - Footer con logo, contacto, navegación, avisos legales y
    "© año Vinos de Remate · Desarrollado por JRNcarrizo@gmail.com" (centrado).
- **Navbar:** solo "Catálogo" y "Contacto". Anclas con `scroll-padding` corregido.

### 3.2 Panel de escritorio (para Jorge)

- **Electron 33** (`admin/main.cjs`, `admin/preload.cjs`, UI en `admin/ui/` con
  HTML/CSS/JS plano, sin bundler).
- Se abre con `npm run panel` o doble clic en `Abrir panel.bat`
  (el .bat también levanta `npm run dev` para vista previa).
- Funciones: alta/edición/borrado de vinos, precios, stock, ofertas, foto
  (copia la imagen a `public/img/`), destacado, Ctrl+S guarda.
- **Guardar** escribe `public/data/productos.json` (actualiza fecha `actualizado`).
- **Publicar** ejecuta `git add -A && git commit && git push` y muestra el log.
- Nota técnica: Electron se instaló con `electron@33` porque la última versión
  fallaba en Windows por un bug de npm con dependencias opcionales
  (`@electron-internal/extract-zip`). Si `npm install` no baja el binario,
  correr: `node node_modules/electron/install.js`.

### 3.3 Publicación (Netlify)

- Repo en GitHub: https://github.com/JRNCarrizo/catalogoProductos
- Deploy: **Netlify** (gratis), config en `netlify.toml`.
  - Build: `npm run build` · Publish: `dist` · Base path: `/`
- Flujo: panel → **Publicar** (git push) → Netlify redeploya solo (1-2 min).
- Subdominio a elección: Site settings → Domain management
  (ej. `vinosderemate.netlify.app`).
- **Falta:** conectar el repo en Netlify (una sola vez) y cargar WhatsApp real
  en `src/config/sitio.ts`.

~~GitHub Pages~~: se descartó porque no permite elegir un subdominio legible
(quedaba `jrncarrizo.github.io/catalogoProductos`). El workflow de Pages se eliminó.

### 3.4 Modelo de datos actual (`src/types.ts`)

```ts
Producto {
  id, nombre, bodega, tipo (Tinto|Blanco|Rosado|Espumante|Dulce|Otro),
  variedad, anio, region,
  precio, precioAnterior (referencia tachada), precioCaja (c/u llevando varias),
  volumenMl, graduacion, stock, destacado,
  imagen (ruta en public/img o URL; vacío = botella ilustrada),
  descripcion, notas[], maridaje
}
Catalogo { actualizado, moneda, productos[] }
```

---

## 4. Visión a futuro (charlado y decidido, NO construido aún)

### 4.1 Decisión de arquitectura

Camino elegido (etapa 1, sin nube):

```
CELULAR (APK Capacitor)              PC (Electron)               WEB
─────────────────────────           ─────────────────           ─────────
Colector de productos:        sync  Recibe cambios,      push   Catálogo
alta/edición, escáner,       ────►  revisa/ajusta,      ────►   online
funciona OFFLINE              WiFi  botón "Publicar"            (Netlify)
```

- El celular es el **colector**: crea y actualiza productos sin depender de nube.
- **Offline primero**: guarda local y mantiene una **cola de cambios pendientes**.
- **Sync celu → PC por WiFi (implementado):**
  - El panel Electron abre un servidor HTTP en el puerto **3847**.
  - Muestra la IP local abajo a la izquierda (ej. `192.168.0.15:3847`).
  - En la APK: **Sync PC** → pegás la IP → **Enviar cambios**.
  - La PC fusiona los cambios en `public/data/productos.json` y refresca el panel.
  - Después: **Publicar** en la PC para subir a Netlify.
- Misma WiFi obligatoria. Si Windows bloquea, permitir Node/Electron en el firewall.

### 4.2 Preparado para nube (etapa 2, si se quiere escalar o dárselo a terceros)

- La estructura debe quedar en capas para que después se pueda enchufar una nube
  (Supabase/Firebase) **sin rehacer los paneles**:
  1. **Fuente local** (celu y PC guardan con la misma estructura).
  2. **Capa de sync** (hoy celu↔PC; mañana celu/PC↔nube). Los paneles hablan con
     un "repositorio" abstracto, no con un archivo o API concretos.
  3. **Publicación** (hoy PC→GitHub→Netlify; con nube podría ser automática).
- Con nube: la APK funciona sola sin PC, se puede dar el sistema a otra persona
  (multi-usuario, un catálogo por persona) y no hace falta "publicar" (tiempo real).

### 4.3 Escáner de código de barras (parte del diseño del APK)

- Con Capacitor (cámara del celular). Es un **atajo, no un requisito**: hay vinos
  sin código útil o con códigos que varían por lote.
- Relación de datos: **un código de barras → varios productos** (mismo vino,
  distintas cosechas). Agregar campo `codigoBarras` al producto
  (a futuro, posiblemente varios códigos por producto).
- Flujo al escanear:
  - **Ninguno** encontrado → crear producto nuevo con el código precargado.
  - **Uno** → abrir directo ese producto (sumar stock / editar precio).
  - **Varios** → lista para elegir mostrando cosecha, precio y stock,
    más la opción **"+ Nueva cosecha de este vino"**.
- "Nueva cosecha" = **duplicar** el producto existente (nombre, bodega, tipo,
  variedad, foto) y pedir solo año, precio y stock.

### 4.4 Orden de construcción acordado

1. (Ya hecho) Catálogo web + panel PC.
2. (Ya hecho) Publicar la web online (Netlify: `vinosderemate.netlify.app`).
3. (En curso) APK admin (Capacitor) en carpeta `colector/`:
   alta/edición, stock +/−, offline, cola de cambios, importar desde la web,
   escáner con flujo de cosechas. Probar con `npm run colector` o generar APK
   con Android Studio (`cd colector && npm run android`).
4. Escáner en dispositivo real + pulir UX.
5. Cola de cambios pendientes + sync celu → PC por WiFi.
6. Pedidos: código corto en WhatsApp + confirmar en panel (historial local)
   + envío pendiente desde la APK.
7. (Opcional futuro) Nube + login para independizarse de la PC y/o dar el
   sistema a terceros. Recomendación: Supabase.
8. (Ideas mencionadas, sin decidir) PDF exportable, Mercado Pago, dominio propio.

---

## 5. Estructura del repo

```
admin/                  Panel de escritorio Electron (main.cjs, preload.cjs, ui/, pedidos)
admin/pedidos.json      Historial y pendientes de pedidos (solo PC)
public/data/productos.json   Fuente de verdad de los productos
public/img/             Fotos de botellas (el panel las copia acá)
src/config/sitio.ts     Marca, WhatsApp, textos (ÚNICO archivo a editar de marca)
src/components/         UI del catálogo
src/hooks/              useCatalogo, useCarrito, useSuperposicion
src/lib/                formato, whatsapp, pedidoCodigo (#nxq), rutas
colector/               APK Capacitor (offline, escáner, sync, pedido→panel)
netlify.toml            Deploy automático en Netlify
Abrir panel.bat         Doble clic: levanta dev server + panel Electron
PLAN.md                 Este documento
README.md               Instrucciones de uso e instalación
```

## 6. Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Catálogo en http://localhost:5173 |
| `npm run panel` | Panel de carga (Electron) |
| `npm run build` | Build de producción (tsc + vite) |
| `npm run preview` | Previsualizar el build |

## 7. Pendientes inmediatos

- [x] Conectar el repo a Netlify y elegir subdominio (`vinosderemate.netlify.app`).
- [x] Poner WhatsApp real en `src/config/sitio.ts`.
- [ ] Publicar WhatsApp + sync + colector a GitHub/Netlify.
- [ ] Reemplazar productos de ejemplo por vinos reales.
- [x] Arrancar APK colectora (`colector/`) con offline + escáner.
- [x] Sync celu → PC por WiFi (puerto 3847).
- [x] Pedidos: código corto WhatsApp + confirmar en panel + historial.
- [ ] Instalar APK actualizada en el celular y probar sync / pedidos.
- [ ] Publicar catálogo (con código en WhatsApp) a Netlify.
