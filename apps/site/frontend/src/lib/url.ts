/**
 * Resolve um path absoluto começando com `/` para o BASE_URL do Vite.
 *
 * Necessário porque o site pode rodar sob diferentes prefixos:
 *   - `/`                 (Cloudflare Pages, domínio próprio)
 *   - `/rft-monorepo/`    (GitHub Pages user/project page)
 *
 * Uso:
 *    <img src={asset("/imagens/foo.jpg")} />
 *    const BG = asset("/imagens/hero.jpg");
 */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
