// Servidor estático minimalista, sin dependencias externas.
// Sirve el build de "MÉTODO 21/7" (React/Vite) para Railway, con fallback de SPA
// para que las rutas del cliente (react-router) funcionen al refrescar/entrar directo.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

/* ================= PROXY A SUPABASE (fix de CORS) =================
 * El bundle original llamaba directo a https://debyagwouidprymnzrnl.supabase.co,
 * pero la función de Supabase que activa el plan (`register-email`) solo permite
 * pedidos con Origin https://debyagwouidprymnzrnl.lovable.app (hardcodeado ahí, y
 * no tenemos acceso al dashboard de Supabase para cambiarlo). El navegador bloquea
 * la respuesta por CORS antes de que la app la vea ("Hubo un problema").
 *
 * Solución: el bundle de assets/index-*.js fue parcheado para llamar a ESTE mismo
 * dominio en vez de a Supabase directamente (ver README). Este servidor reenvía
 * esos pedidos a Supabase por atrás — servidor a servidor, donde CORS no aplica —
 * y le devuelve la respuesta al navegador como si fuera propia (mismo origen,
 * sin problema de CORS). Si el dominio de este deploy cambia (dominio propio,
 * otro proyecto de Railway, etc.), hay que volver a correr el mismo `sed` del
 * README sobre el bundle para apuntar al dominio nuevo.
 */
const SUPABASE_HOST = 'debyagwouidprymnzrnl.supabase.co';
const SUPABASE_PROXY_PREFIXES = ['/auth/v1/', '/rest/v1/', '/functions/v1/', '/storage/v1/'];

function isSupabaseProxyPath(pathname) {
  return SUPABASE_PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function proxyToSupabase(req, res) {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    if (body.length) headers['content-length'] = String(Buffer.byteLength(body));

    const proxyReq = https.request(
      {
        hostname: SUPABASE_HOST,
        path: req.url, // incluye query string tal cual
        method: req.method,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
    });
    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (isSupabaseProxyPath(urlPath)) {
    proxyToSupabase(req, res);
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));

  // Evita path traversal fuera del directorio del proyecto.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: cualquier ruta no encontrada devuelve index.html
      // (necesario para que el router del cliente maneje rutas como /dia/3, /login, etc.)
      fs.readFile(path.join(ROOT, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Método 21/7 corriendo en el puerto ${PORT}`);
});
