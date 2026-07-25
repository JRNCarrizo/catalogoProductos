# Catálogo de vinos

> **Plan completo del proyecto y decisiones tomadas:** ver [PLAN.md](PLAN.md).

Sitio web profesional (oscuro, estilo premium) para mostrar y vender vinos, más un **panel de escritorio** para cargar productos y publicar el catálogo **sin costo**.

Los pedidos se arman en un carrito y se envían por WhatsApp.

## Cómo funciona

```
Panel de escritorio (tu PC)          GitHub (gratis)           Cliente
─────────────────────────           ───────────────           ───────
Cargás vinos / precios / fotos  →  Publicar (git push)  →  Ve el catálogo online
Guardás productos.json                                  →  Arma pedido por WhatsApp
```

- **Catálogo público:** página web moderna, responsive.
- **Datos:** archivo `public/data/productos.json` (lo edita el panel).
- **Hosting:** GitHub Pages, gratis.
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
- **Publicar** (sube los cambios a GitHub; el sitio online se actualiza solo)

Atajo: `Ctrl + S` guarda.

## Datos tuyos (importante)

Antes de compartir el catálogo, editá:

### WhatsApp y marca — `src/config/sitio.ts`

```ts
whatsapp: '5491112345678',       // número internacional, sin + ni espacios
whatsappVisible: '+54 9 11 1234-5678',
nombre: 'Tu Vinoteca',
email: 'tu@correo.com',
ciudad: 'Tu ciudad',
instagram: 'https://instagram.com/tuusuario',
```

Después de cambiar eso, volvé a publicar.

### Productos — con el panel

No hace falta tocar el JSON a mano. El panel escribe en `public/data/productos.json`.

Las fotos se copian a `public/img/`.

## Publicar online (gratis)

1. Creá un repositorio vacío en GitHub.
2. En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Catálogo de vinos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

3. En GitHub: **Settings → Pages → Source: GitHub Actions**.
4. El workflow `.github/workflows/publicar.yml` construye y publica solo.
5. El link queda así: `https://TU_USUARIO.github.io/TU_REPO/`

Desde entonces, cada vez que toques **Publicar** en el panel, el catálogo online se actualiza.

## Estructura

```
admin/                  Panel de escritorio (Electron)
public/data/            productos.json (fuente de verdad)
public/img/             fotos de botellas
src/config/sitio.ts     nombre, WhatsApp, textos de marca
src/components/         interfaz del catálogo
.github/workflows/      publicación automática
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Catálogo en local |
| `npm run panel` | Panel para cargar productos |
| `npm run build` | Genera la versión para publicar |
| `npm run preview` | Previsualiza el build |

## Próximos pasos posibles

- Dominio propio (ej. `vinos.com.ar`) apuntando a GitHub Pages
- Exportar PDF del catálogo
- Mercado Pago cuando quieras cobrar online
