# Rule34 Viewer

Self-hosted browser for Rule34 with a same-origin API, custom media playback, downloads, tag search, score filtering and named super-tags.

## Features

- Tag autocomplete, exclusion tags and per-tab search state.
- Named super-tags, including default sets and reversible exclusions.
- Score filtering and sort by date or score.
- Inline images and custom video controls.
- Open-original and download actions through a guarded media proxy.
- Direct official API support with an optional public-proxy fallback.

## Run locally

Requires Node.js 20 or newer. No package installation is required.

```powershell
node src/server.js
```

Then open `http://127.0.0.1:8082/`.

## Configuration

Copy `.env.example` to `.env` when using Docker Compose, or configure the variables in your process manager. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `R34_API_KEY` | Official API key. When both credentials are present, it is the primary post source. |
| `R34_USER_ID` | Account ID associated with the API key. |
| `R34_PROXY_URL` | Optional public fallback endpoint. |
| `UPSTREAM_TIMEOUT_MS` | Upstream request timeout in milliseconds. |

If official credentials are absent or a direct request fails, the viewer uses the configured fallback endpoint.

## API routes

- `GET /api/posts?tags=...&page=0&limit=40`
- `GET /api/tags?q=...`
- `GET /api/comments?postId=...`
- `GET /api/media?url=...`
- `GET /api/download?url=...`
- `GET /api/health`

## Development

```powershell
node --test
```

The project has no runtime npm dependencies.

