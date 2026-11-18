# Vehicle scheduling assistant

Standalone Vercel service for Feature 9. The EC2 API is the only caller. It POSTs a signed, role-scoped chat request to `/api/chat`. This service calls Groq Cloud with the tools in that request, runs each tool by POSTing back to the EC2 API with the caller's tool token, and returns `{ reply, draft }`.

The model can read data and draft a reservation. It cannot create, approve, deny, or cancel one. The user confirms the draft in the app, which calls Feature 6 `POST /reservations`.

## Local run

```bash
cd assistant
npm install
cp .env.example .env
# Fill in GROQ_API_KEY and ASSISTANT_SHARED_SECRET. Leave APP_API_BASE_URL pointed at the local API.
npm run dev
```

`npm run dev` listens on `127.0.0.1` and `::1`, port `PORT` or `3300`. Point the API at it with `ASSISTANT_URL=http://127.0.0.1:3300`. The same `ASSISTANT_SHARED_SECRET` must be set on both sides. `APP_API_BASE_URL` must end with `/` (local default `http://localhost:3200/api/`). Leave this process running in its own terminal while the API is running.

```bash
npm test
```

## Vercel

1. Import this GitHub repository in Vercel.
2. Set **Root Directory** to `assistant`.
3. Set the framework preset to **Other**.
4. Add these environment variables as **Sensitive** for Production and Preview:
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (a Groq model that supports tool calling, such as `openai/gpt-oss-120b`; verify the id in the Groq console)
   - `ASSISTANT_SHARED_SECRET`
   - `APP_API_BASE_URL` (production base, with a trailing slash, for example `https://<host>/vehicle-t4/`)
5. Deploy.
6. Put the deployment URL in the GitHub secret `ASSISTANT_URL` (no trailing path; the API calls `{ASSISTANT_URL}/api/chat`).
7. Put the same random secret in the GitHub secret `ASSISTANT_SHARED_SECRET` and in the Vercel variable of that name.

Generate the secret with:

```bash
openssl rand -hex 32
```

`assistant/vercel.json` sets `api/chat.js` `maxDuration` to 60 seconds so the function can finish inside the API's 45-second budget.

## Security

- `GROQ_API_KEY` lives only on Vercel. It is not placed on EC2, in GitHub Actions, or in the frontend.
- EC2 signs `${timestamp}.${rawBody}` with HMAC-SHA256. This service rejects a missing signature, a body that does not match, and a timestamp more than 5 minutes off, using a timing-safe compare.
- The tool token is opaque here. It is forwarded as `Authorization: Bearer` on tool calls and is not a session token. This service does not log the token, the API key, or the shared secret.
