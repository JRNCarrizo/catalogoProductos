# Vinos Colector (APK)

App de celular para cargar y actualizar productos **offline**, con escáner de
código de barras. Es el colector del plan: más adelante sincroniza con la PC.

## Qué hace hoy

- Lista de productos con stock **+ / −**
- Alta y edición de vinos
- Campo **código de barras**
- **Escanear**:
  - 0 coincidencias → crear producto con el código
  - 1 coincidencia → abrir ese producto
  - Varias → lista por cosecha + “Nueva cosecha”
- Guardado **offline** (Preferences / almacenamiento local)
- Cola de **cambios pendientes** (lista para sync a la PC)
- Botón **↓ Web**: importa el catálogo desde `vinosderemate.netlify.app`

## Probar en la PC (sin celular)

```bash
cd colector
npm run dev
```

Abrí http://localhost:5173. El escáner pide el código a mano (modo prueba).

## Generar la APK (Android)

Necesitás **Android Studio** instalado.

```bash
cd colector
npm run android
```

Eso construye la web, sincroniza Capacitor y abre Android Studio.
Ahí: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

También podés instalar en un celular por USB con Run ▶.

### Permisos

La cámara se pide la primera vez que escaneás. El plugin
`@capacitor-mlkit/barcode-scanning` usa ML Kit de Google.

## Flujo de trabajo sugerido

1. En el celu: **↓ Web** para traer el catálogo actual (con internet).
2. Cargás / escaneás / ajustás stock sin señal.
3. (Próximo paso del plan) Sync a la PC → Publicar en Netlify.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Vista previa en navegador |
| `npm run build` | Build web |
| `npm run sync` | Build + `cap sync android` |
| `npm run android` | Sync y abre Android Studio |
