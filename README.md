# exness-india-server

Express API for Exness India auth and user profiles.

## Render environment variables

Set these in **Render → your service → Environment**:

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | From Render PostgreSQL (Internal URL) |
| `DATABASE_SSL` | Yes (Render Postgres) | `true` |
| `FIREBASE_PROJECT_ID` | Yes | `exness-india` |
| `FIREBASE_WEB_API_KEY` | Yes | Same as `VITE_FIREBASE_API_KEY` in frontend |
| `FRONTEND_URL` | Yes | `https://exness-india-server.onrender.com` |

`FIREBASE_WEB_API_KEY` must match the Web API key from Firebase Console → Project settings → Your apps.

Check deployment health: `GET /health` — if `missingEnv` includes `FIREBASE_WEB_API_KEY`, add it in Render and redeploy.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```
