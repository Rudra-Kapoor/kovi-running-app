# Kovi Admin (internal panel)

Web panel for our own team: create/edit/delete events, upload banners and sponsor logos, and view
participants and leaderboards. There are no organiser accounts and no public access - sign in with an
admin account created by the API (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

React 19 + Vite + TypeScript, no UI framework.

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm install
npm run dev              # http://localhost:5173
```

The API URL can also be changed at runtime from the login screen ("Advanced"), which is handy when the
panel is hosted statically (GitHub Pages) and the API moves.

## Build / deploy

```bash
VITE_API_URL=https://your-api.example.com VITE_BASE_PATH=/kovi-running-app/ npm run build
```

`dist/` is a static site. `.github/workflows/admin-pages.yml` builds and publishes it to GitHub Pages on
every push to `main`. Routing uses hash URLs so no server rewrites are needed.
