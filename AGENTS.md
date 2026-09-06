# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Local Dev Environment (Base44 sandbox)

The app runs via `docker compose -f docker-compose.base44.yml up -d` (web service on host port 3000).
Key quirks discovered during setup:

- **`base44 dev` rejects `BASE44_APP_ID`.** The app id must come only from `base44/.app.jsonc`
  (gitignored). `.base44/dev-entrypoint.sh` writes that file from the `BASE44_APP_ID` secret,
  then `unset BASE44_APP_ID` before exec'ing `base44 dev`.
- **Auth.** `base44 dev` requires Base44 auth. Either set `BASE44_API_KEY` to a `b44k_`-prefixed
  workspace API key (non-interactive; dashboard → Workspace Settings → API keys), OR complete the
  one-time device-code login printed in the container logs. Login state persists in the named
  `base44-auth` volume (`/root/.base44`), so the device-code login survives restarts/recreations.
  A `BASE44_API_KEY` value without the `b44k_` prefix is silently ignored and triggers the
  device-code flow.
- **Vite host.** `vite.config.js` sets `server.host: true` and `allowedHosts: true` so the preview's
  external hostname is accepted (Vite otherwise blocks it as an unknown host).
- After editing `vite.config.js` or compose, restart the web service and `reload_preview`.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
