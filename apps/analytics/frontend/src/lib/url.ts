/**
 * Resolve um path absoluto começando com `/` para o BASE_URL do Vite.
 *
 * O analytics é buildado com base = "${SITE_BASE}/analytics/", que pode ser:
 *   - `/analytics/`              (Cloudflare Pages, domínio próprio)
 *   - `/rft-monorepo/analytics/` (GitHub Pages)
 *
 * Uso:
 *    <img src={asset("/imagens/rft-losango.png")} />
 */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
