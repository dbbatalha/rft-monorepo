#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Build de produção unificado: site + analytics em um único `dist/` na raiz.
#
# Estrutura final (servida na raiz do domínio):
#   dist/
#   ├── index.html               ← site institucional (rftbrasil.com/)
#   ├── assets/                  ← JS/CSS do site
#   ├── imagens/                 ← fotos
#   ├── .htaccess                ← SPA fallback duplo (raiz + /analytics/)
#   └── analytics/               ← plataforma scouting (rftbrasil.com/analytics/)
#       ├── index.html
#       ├── assets/
#       ├── imagens/
#       └── data/                ← JSONs estáticos + model.onnx
#
# Usado pelo Cloudflare Pages como `Build command: ./build-prod.sh`
# (output dir = `dist`).
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$ROOT/dist"

echo "═══ Build de produção — site + analytics ═══"
echo

# 1. Garante deps instaladas
if [ ! -d "$ROOT/node_modules" ]; then
  echo "▶ Instalando dependências (pnpm install)..."
  pnpm install --frozen-lockfile
fi

# 2. Build dos dois apps
echo "▶ Build @rft/site-frontend..."
pnpm --filter @rft/site-frontend build

echo
echo "▶ Build @rft/analytics-frontend..."
pnpm --filter @rft/analytics-frontend build

# 3. Remove WASM do ONNX gerado pelo bundler (~26MB) — carregamos do CDN em runtime
rm -f "$ROOT/apps/analytics/frontend/dist/assets/ort-wasm-"*.wasm

# 4. Monta dist/ unificado na raiz do monorepo
echo
echo "▶ Montando dist/ unificado..."
rm -rf "$DIST"
mkdir -p "$DIST"
cp -R "$ROOT/apps/site/frontend/dist/"./. "$DIST/"

mkdir -p "$DIST/analytics"
cp -R "$ROOT/apps/analytics/frontend/dist/"./. "$DIST/analytics/"

# 5. .htaccess (SPA fallback duplo + gzip + cache + tipos MIME)
cat > "$DIST/.htaccess" <<'EOF'
# RFT — site institucional + plataforma de analytics (SPA)

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Permite o desafio do Let's Encrypt (renovação SSL)
  RewriteRule ^\.well-known/.* - [L]

  # /analytics/* sem arquivo nem pasta correspondente → /analytics/index.html
  RewriteCond %{REQUEST_URI} ^/analytics(/.*)?$
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /analytics/index.html [L]

  # Demais URLs sem arquivo → /index.html (site institucional)
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript
  AddOutputFilterByType DEFLATE application/javascript application/json
  AddOutputFilterByType DEFLATE application/octet-stream image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html              "access plus 0 seconds"
  ExpiresByType application/json       "access plus 1 hour"
  ExpiresByType text/css               "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png              "access plus 1 month"
  ExpiresByType image/jpeg             "access plus 1 month"
  ExpiresByType image/webp             "access plus 1 month"
  ExpiresByType image/x-icon           "access plus 1 year"
  ExpiresByType application/wasm       "access plus 1 month"
</IfModule>

<IfModule mod_mime.c>
  AddType application/octet-stream .onnx
  AddType application/wasm .wasm
</IfModule>
EOF

# 6. _redirects (Cloudflare Pages / Netlify) — alternativa ao .htaccess
cat > "$DIST/_redirects" <<'EOF'
# Cloudflare Pages / Netlify SPA fallback
/analytics/*  /analytics/index.html  200
/*            /index.html            200
EOF

# 7. Resumo
echo
echo "═══ Build concluído ═══"
du -sh "$DIST"
echo
echo "Estrutura:"
ls -la "$DIST" | head -10
echo
echo "Output: $DIST"
