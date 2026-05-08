# Site Institucional RFT

Aplicação estática (Vite + React + Tailwind) com a página da academia: hero, modalidades, professores, planos, horários, galeria, localização, contato.

- URL pública: `https://rftbrasil.com/`
- Sem backend próprio (o site não persiste dados; o formulário de contato abre WhatsApp).
- Build estática servida atrás de nginx em produção.

## Comandos

```bash
pnpm dev        # http://localhost:8009/
pnpm build      # gera dist/
pnpm preview    # preview da build
pnpm typecheck
```

## Estrutura

```
apps/site/frontend/
├── public/imagens/     # flyers, fotos da academia, rft-losango.png, etc.
├── src/
│   ├── components/     # Hero, Modalidades, Professores, Planos, Horários, Galeria, Localização, Contato, Footer, Navbar, WhatsAppFloat
│   ├── contexts/       # ThemeContext
│   ├── hooks/          # useMobile, useComposition, usePersistFn
│   ├── lib/            # utils
│   ├── pages/          # Home, NotFound, ComponentShowcase
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts      # base "/"
├── tsconfig.json
└── package.json
```

## Imports

- `@/...` → `apps/site/frontend/src/...`
- `@rft/shared/...` → `packages/shared/src/...` (utilidades compartilhadas com analytics)
