# Catálogo de vinos

> **Plan completo del proyecto y decisiones tomadas:** ver [PLAN.md](PLAN.md).

Sitio web profesional (oscuro, estilo premium) para mostrar y vender vinos, más un **panel de escritorio** para cargar productos y publicar el catálogo **sin costo**, y una **APK colectora** para cargar stock y tomar pedidos desde el celular (offline).

Los pedidos se arman en un carrito y se envían por WhatsApp con un **código corto** (`#3x2,7x1`) que después se pega en el panel o en la APK para confirmar y descontar stock.

## Cómo funciona

```
Panel de escritorio (tu PC)     GitHub (código)      Netlify (web gratis)     Cliente
─────────────────────────      ───────────────      ────────────────────     ───────
Cargás vinos / precios     →   Publicar (push)  →   Deploy automático   →   Ve el catálogo
Guardás productos.json                                                      Pedido por WhatsApp
```

- **Catálogo público:** página web moderna, responsive.
- **Datos:** archivo `public/data/productos.json` (lo edita el panel).
- **Hosting:** Netlify, gratis (subdominio tipo `vinosderemate.netlify.app`).
- **Código:** GitHub ([JRNCarrizo/catalogoProductos](https://github.com/JRNCarrizo/catalogoProductos)).
- **Sin medios de pago por ahora:** el cliente manda el pedido listo a tu WhatsApp.

## Arranque rápido

### 1. Instalar dependencias (solo la primera vez)

```bash
npm install
node node_modules/electron/install.js
```

### 2. Ver el catálogo en tu PC

```bash
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173).

### 3. Abrir el panel para cargar productos

Doble clic en **`Abrir panel.bat`**, o:

```bash
npm run panel
```

En el panel podés:

- Agregar / editar / eliminar vinos
- Cambiar precios, stock, ofertas
- Subir fotos de botellas
- Guardar (actualiza `productos.json`)
- **Publicar** (sube a GitHub; Netlify actualiza el sitio solo)
- **Pedidos**: pegar el mensaje de WhatsApp del cliente, ver la vista previa,
  **Confirmar** (descuenta stock) y consultar Pendientes / Historial
  (con opción de anular, que devuelve el stock)
- **Sync celular**: recibe cambios de catálogo y pedidos desde la APK por WiFi

Atajo: `Ctrl + S` guarda.

## Flujo de un pedido

1. El cliente arma el carrito en la web y manda el pedido por WhatsApp
   (incluye el código corto al final, ej. `#3x2,7x1`).
2. Confirmás con el cliente por chat.
3. Pegás el mensaje en **panel → Pedidos → Nuevo pedido** (o en la APK →
   **Pedido**, que lo manda al panel; si no hay WiFi queda guardado offline
   y se envía después).
4. **Confirmar** en el panel: descuenta stock y guarda el pedido en el historial.
5. **Publicar** para que la web muestre el stock actualizado.

## Datos tuyos (importante)

Antes de compartir el catálogo, editá:

### WhatsApp y marca — `src/config/sitio.ts`

```ts
whatsapp: '5491112345678',       // número internacional, sin + ni espacios
whatsappVisible: '+54 9 11 1234-5678',
nombre: 'Vinos de Remate',
email: 'tu@correo.com',
ciudad: 'Tu ciudad',
instagram: 'https://instagram.com/tuusuario',
```

Después de cambiar eso, volvé a publicar.

### Productos — con el panel

No hace falta tocar el JSON a mano. El panel escribe en `public/data/productos.json`.

Las fotos se copian a `public/img/`.

## Publicar online en Netlify (gratis)

El código ya está en GitHub. Falta conectar Netlify:

1. Entrá a [https://app.netlify.com](https://app.netlify.com) e iniciá sesión **con GitHub**.
2. **Add new site** → **Import an existing project**.
3. Elegí el repo `JRNCarrizo/catalogoProductos`.
4. Netlify detecta `netlify.toml` solo (build: `npm run build`, publish: `dist`). Deploy.
5. Cuando termine: **Site configuration** → **Domain management** → **Options** → **Edit site name**.
   Poné algo como `vinosderemate` (si está libre).
6. El link queda: `https://vinosderemate.netlify.app`

Desde entonces, cada vez que toques **Publicar** en el panel (git push), Netlify redeploya solo.

## Estructura

```
admin/                  Panel de escritorio (Electron) + pedidos + sync WiFi
admin/pedidos.json      Pendientes e historial de pedidos (local)
public/data/            productos.json (fuente de verdad)
public/img/             fotos de botellas
src/config/sitio.ts     nombre, WhatsApp, textos de marca
src/components/         interfaz del catálogo
colector/               APK Android (Capacitor): stock, escáner, pedidos offline
netlify.toml            configuración de deploy en Netlify
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Catálogo en local |
| `npm run panel` | Panel para cargar productos |
| `npm run build` | Genera la versión para publicar |
| `npm run preview` | Previsualiza el build |
| `cd colector && npm run apk` | Genera la APK (`colector/apk/VinosColector-debug.apk`) |

## APK colectora

Ver [colector/README.md](colector/README.md). En resumen: alta/edición de
vinos con escáner de código de barras, todo offline, sync con el panel por
WiFi (puerto 3847) y envío de pedidos al panel con cola offline.

## Próximos pasos posibles

- Dominio propio (ej. `vinos.com.ar`) apuntando a Netlify
- Exportar PDF del catálogo
- Mercado Pago cuando quieras cobrar online
- Nube (Supabase) para independizarse de la PC (ver PLAN.md)
