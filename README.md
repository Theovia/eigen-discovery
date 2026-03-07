# Discovery Brief Interactivo — Eigen Atlas

Formulario web premium para discovery de consultoría de IA. Los clientes llenan el formulario y las respuestas llegan formateadas a Telegram.

## Arquitectura

```
┌─────────────────────┐     POST JSON     ┌──────────────────────┐     Bot API     ┌──────────┐
│  GitHub Pages       │ ───────────────▶  │  Cloudflare Worker   │ ──────────────▶ │ Telegram │
│  (frontend/         │                   │  (discovery-webhook) │                 │ Chat     │
│   index.html)       │ ◀─────────────── │                      │                 │          │
└─────────────────────┘   JSON response   └──────────────────────┘                 └──────────┘
```

## Estructura

```
├── frontend/
│   └── index.html      # Formulario interactivo (GitHub Pages)
├── worker/
│   ├── src/index.js    # Cloudflare Worker (webhook → Telegram)
│   ├── wrangler.toml   # Configuración del Worker
│   └── package.json
└── README.md
```

## Cómo agregar formularios para otros clientes

1. Copiar `frontend/index.html` a `frontend/nombre-cliente.html`
2. Editar las preguntas, contexto, y título
3. Actualizar el array `PREGUNTAS` en el `<script>` al final del HTML
4. Push a GitHub — GitHub Pages lo sirve automáticamente

El Worker es genérico: acepta cualquier JSON con `{despacho, contacto, contactInfo, preguntas: [{tag, pregunta, respuesta}]}` y lo formatea a Telegram.

## Deploy

### Worker (Cloudflare)
```bash
cd worker
export CLOUDFLARE_API_TOKEN=<token>
npx wrangler deploy
echo "<BOT_TOKEN>" | npx wrangler secret put TELEGRAM_BOT_TOKEN
```

### Frontend (GitHub Pages)
Push a `main` branch → Settings → Pages → Source: `/frontend` (o root).

## Variables de Entorno

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `CLOUDFLARE_API_TOKEN` | Local/CI | Auth para wrangler deploy |
| `TELEGRAM_BOT_TOKEN` | Worker secret | Bot de Telegram para envío |
| `TELEGRAM_CHAT_ID` | Hardcoded en worker | `5399533539` |

## URLs

- **Frontend:** `https://theovia.github.io/eigen-discovery/`
- **Worker:** `https://discovery-webhook.raul-chio-leon.workers.dev`
