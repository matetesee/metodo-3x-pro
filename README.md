# Método Camina 3X — mirror de recuperación

> Se llamaba **"MÉTODO 21/7"** en el sitio original de Lovable. Por pedido del
> dueño se rebrandeó a **"Método Camina 3X"**: título, meta tags, manifest de
> la PWA, logo, íconos y las apariciones del nombre dentro de la app (no se
> tocaron las menciones internas al "modelo 21/7" / "Plato 21/7" / "Planilla
> de Progreso 21/7" — son nombres de piezas del contenido/metodología, no la
> marca; avisá si también hay que renombrarlas).

Copia exacta del **build de producción** que estaba sirviendo
`https://appmetodo217.lovable.app`, re-empaquetada para poder alojarla fuera de
Lovable (se perdió el acceso a esa cuenta/proyecto de Lovable, no al dominio en sí).

No es una reconstrucción desde cero: son los mismos archivos compilados
(`index.html`, JS, CSS e imágenes) que el sitio original le entrega hoy al
navegador, tal cual, servidos ahora por un server Node minimalista en vez del
hosting de Lovable.

## Qué SÍ funciona igual
La app original es una SPA en React/Vite con backend real en **Supabase**
(proyecto `debyagwouidprymnzrnl`), con login/signup por email y una función
`coach-chat`. El bundle de JS trae la URL y la *anon key* de ese proyecto
hardcodeadas (es la práctica normal de Supabase, la anon key es pública por
diseño). Verificado al armar esta copia:
- El endpoint de auth de Supabase respondía `200 OK` con signup por email
  habilitado.
- La función `coach-chat` respondía al preflight (`OPTIONS` → `200`).

O sea que, salvo que ese proyecto de Supabase se elimine o se revoque la key,
login y datos de usuario deberían seguir funcionando exactamente igual que en
el original, porque apunta al mismo backend.

## Bug conocido y ya arreglado: CORS en "Activar mi plan"
Al probarlo en producción, activar el plan tiraba "Hubo un problema. Intentá de
nuevo." La causa: la función de Supabase `register-email` solo acepta pedidos
con `Origin: https://debyagwouidprymnzrnl.lovable.app` (hardcodeado ahí), y no
tenemos acceso al dashboard de Supabase para cambiarlo. El navegador bloqueaba
la respuesta por CORS antes de que la app la viera.

**Arreglo aplicado:** se parchearon las dos ocurrencias de la URL de Supabase
dentro de `assets/index-Cnl7J6tT.js` (antes `https://debyagwouidprymnzrnl.supabase.co`)
para que apunten a este mismo dominio, y `server.js` ahora hace de proxy:
reenvía cualquier pedido a `/auth/v1/*`, `/rest/v1/*`, `/functions/v1/*` o
`/storage/v1/*` hacia Supabase por atrás (servidor a servidor, donde CORS no
aplica) y devuelve la respuesta como si fuera propia. Así el navegador solo
habla con este dominio — sin problema de CORS — y Supabase sigue recibiendo
los pedidos igual que antes.

**Si el dominio de este deploy cambia** (dominio propio, otro proyecto de
Railway, etc.), hay que repetir el patch sobre el bundle apuntando al dominio
nuevo:
```bash
sed -i 's#https://debyagwouidprymnzrnl\.supabase\.co#https://TU-DOMINIO-NUEVO#g' assets/index-Cnl7J6tT.js
```

## Bug conocido y ya arreglado: el coach no respondía ("Error al procesar tu mensaje")
Otro bug del original (no relacionado con la migración): al escribirle a la
coach Ana, la app intenta actualizar la cuota diaria de mensajes en
`user_plan_preferences` y manda una columna de fecha (ej. `last_reset_at`)
como string vacío `""` en vez de `null`. Postgres la rechaza
(`22007: invalid input syntax for type date`), la petición corta con 400 y el
chat nunca llega a llamar a la función `coach-chat`.

**Arreglo aplicado:** `server.js` sanea el cuerpo de cualquier `PATCH`/`POST`
JSON hacia `/rest/v1/*` — si un campo termina en `_at` o `_date` y llega como
`""`, lo convierte en `null` antes de reenviarlo a Supabase. Ya probado en
producción: el chat con Ana funciona.

## Qué NO se puede garantizar
- **No hay acceso al dashboard de Supabase** (se perdió junto con el de
  Lovable), así que no se puede ver/exportar la base de datos de usuarios, ni
  tocar la función `coach-chat` si algo falla más adelante (por ejemplo si
  tenía una key de IA con costo que vence). Ya se probó en producción y Ana
  responde a los mensajes.
- No existe el código fuente original (componentes React, lógica) — solo el
  build compilado y minificado. Si en algún momento hay que **modificar** la
  app (cambiar textos, agregar una pantalla, etc.), hay que reconstruirla
  como proyecto propio (mismo patrón que `gluteos-pro` / `calistenia-pro`),
  no editando este bundle.
- Se sacó del `<head>` un script (`/~flock.js`) que Lovable inyecta para su
  propio analytics interno — solo funciona en su hosting, no en Railway.

## Estructura
- `index.html` — el HTML original, sin el script de analytics de Lovable.
- `assets/` — el bundle JS/CSS compilado y las imágenes que usa (logo, foto
  del coach), con los mismos nombres de archivo que en el original.
- `manifest.json`, `icon-192.png`, `icon-512.png`, `robots.txt` — assets de
  PWA/SEO copiados tal cual.
- `server.js` — servidor estático sin dependencias, con fallback de SPA
  (cualquier ruta no encontrada devuelve `index.html`, necesario para el
  router del cliente).
- `package.json` — script `start` que corre `server.js`.

## Correr en local
```bash
npm start
```
Abrí `http://localhost:3000`.

## Deploy en Railway
1. Entrá a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Elegí este repositorio.
3. Railway detecta Node automáticamente (vía `package.json`) y corre `npm start`.
4. Cada push a `main` dispara un nuevo deploy automático.
