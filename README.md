# Catálogo de vinos

> **Plan completo del proyecto y decisiones tomadas:** ver [PLAN.md](PLAN.md).

Sitio web profesional (oscuro, estilo premium) para mostrar y vender vinos, más un **panel de escritorio** para cargar productos y publicar el catálogo **sin costo**.

Los pedidos se arman en un carrito y se envían por WhatsApp.

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

Atajo: `Ctrl + S` guarda.

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
admin/                  Panel de escritorio (Electron)
public/data/            productos.json (fuente de verdad)
public/img/             fotos de botellas
src/config/sitio.ts     nombre, WhatsApp, textos de marca
src/components/         interfaz del catálogo
netlify.toml            configuración de deploy en Netlify
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Catálogo en local |
| `npm run panel` | Panel para cargar productos |
| `npm run build` | Genera la versión para publicar |
| `npm run preview` | Previsualiza el build |

## Próximos pasos posibles

- Dominio propio (ej. `vinos.com.ar`) apuntando a Netlify
- APK colectora + escáner (ver PLAN.md)
- Exportar PDF del catálogo
- Mercado Pago cuando quieras cobrar online
