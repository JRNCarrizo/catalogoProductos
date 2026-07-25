# Vinos Colector (APK)

App de celular para cargar y actualizar productos **offline**, con escáner de
código de barras, sincronización WiFi con el panel de la PC y toma de
pedidos de WhatsApp.

## Qué hace hoy

- Lista de productos con stock **+ / −**
- Alta y edición de vinos
- Campo **código de barras**
- **Escanear**:
  - 0 coincidencias → crear producto con el código
  - 1 coincidencia → abrir ese producto
  - Varias → lista por cosecha + “Nueva cosecha”
  - La primera vez en Android descarga solo el módulo de escaneo de Google
    (muestra el progreso; necesita internet solo esa vez)
- Guardado **offline** (Preferences / almacenamiento local)
- Cola de **cambios pendientes** que se envía a la PC con **Sync PC**
- Botón **↓ Web**: importa el catálogo desde `vinosderemate.netlify.app`
- **Sync PC** (WiFi, puerto 3847): escaneás el QR del panel o pegás la IP
  una sola vez; después queda guardada
- **Pedido**: pegás el mensaje de WhatsApp (o solo el código `#3x2,7x1`),
  ves la vista previa con totales y stock, y lo enviás al panel
  - **Sin conexión**: el pedido queda en una **cola offline** en el celular
    (botón “Guardar offline”, o automático si falla el envío)
  - Con WiFi: **Enviar pendientes** (o el Sync PC normal) manda todo y
    vacía la cola
  - Si el pedido ya estaba pendiente o ya fue confirmado en el panel,
    la app lo avisa con un mensaje claro
  - El botón principal muestra `Pedido (N)` si hay pedidos por enviar

## Probar en la PC (sin celular)

```bash
cd colector
npm run dev
```

Abrí http://localhost:5173. El escáner pide el código a mano (modo prueba).

## Generar la APK (Android)

La forma rápida (sin abrir Android Studio):

```bash
cd colector
npm run apk
```

La APK queda en `colector/apk/VinosColector-debug.apk`. Pasala al celular
(WhatsApp, cable, etc.) e instalala.

Alternativa con Android Studio:

```bash
cd colector
npm run android
```

Eso construye la web, sincroniza Capacitor y abre Android Studio.
Ahí: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

### Permisos

La cámara se pide la primera vez que escaneás. El plugin
`@capacitor-mlkit/barcode-scanning` usa ML Kit de Google.

## Flujo de trabajo sugerido

1. En el celu: **↓ Web** para traer el catálogo actual (con internet).
2. Cargás / escaneás / ajustás stock sin señal.
3. **Sync PC** en la misma WiFi que el panel → los cambios (y los pedidos
   offline) pasan a la PC.
4. En la PC: revisás, confirmás pedidos y **Publicar** → Netlify actualiza la web.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Vista previa en navegador |
| `npm run build` | Build web |
| `npm run sync` | Build + `cap sync android` |
| `npm run apk` | Genera `apk/VinosColector-debug.apk` |
| `npm run android` | Sync y abre Android Studio |
