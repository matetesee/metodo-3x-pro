# Método 21/7 — mirror de recuperación

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

## Qué NO se puede garantizar
- **No hay acceso al dashboard de Supabase** (se perdió junto con el de
  Lovable), así que no se puede ver/exportar la base de datos de usuarios, ni
  tocar la función `coach-chat` si algo falla (por ejemplo si tenía una key de
  IA con costo que ya venció). Probá el chat del coach en producción para
  confirmar que responde.
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
