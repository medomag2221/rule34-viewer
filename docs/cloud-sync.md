# Cloud sync integration boundary

The browser currently persists `pageSize`, the active query, saved tags, and supertags in `localStorage` under
`r34-viewer`. The PostgreSQL schema is in `db/migrations/001_identity_and_tags.sql`.

Planned Google OAuth flow:

1. Backend validates a Google OpenID Connect ID token and upserts `app_user` by immutable `google_subject` (`sub`).
2. Backend issues its own `HttpOnly`, `Secure`, `SameSite=Lax` session cookie. Google tokens are not stored in the
   browser application's local storage.
3. `GET/PUT /api/me/preferences`, `/api/me/tags`, and `/api/me/supertags` synchronize the existing local model.
4. First sign-in merges local data into the server account; later server revisions win per collection.

Required future configuration: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and the
public callback URL. No authentication UI is exposed until those values and the server-side session implementation exist.

