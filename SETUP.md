# Run and connect Abide

## Local development

Use Node.js 24 or later. Install the locked dependencies with `npm ci`.

```sh
cd /workspace/Bible_study
npm ci
npm start
```

The app uses port 3000 by default; set `PORT` to override it. Run `npm test` for the automated server checks. In a managed environment that supplies HTTP/HTTPS proxies, Node.js 24 supports proxy-aware fetch with:

```sh
NODE_USE_ENV_PROXY=1 npm start
```

Keep the supplied proxy and certificate trust settings. Use the same flag for live integration tests when needed.

## Configuration

Supply these through the hosting service's environment or secure secret settings. Never put credentials in public JavaScript, commit them to Git, or paste them into a chat.

| Variable | Purpose |
| --- | --- |
| `ABIDE_OPENAI_KEY` | OpenAI API key, preferred name for this managed environment. |
| `OPENAI_API_KEY` | Alternative key name on hosts that permit it; used only if `ABIDE_OPENAI_KEY` is absent. |
| `OPENAI_MODEL` | Optional model override; default is `gpt-4.1-mini`. The API account must have access. |
| `GOOGLE_CLIENT_ID` | Google OAuth web application client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret; server-only. |
| `APP_URL` | Exact origin where the app is opened, without a trailing slash, such as `http://localhost:3000` locally or the deployed HTTPS origin. |
| `PORT` | Optional HTTP listen port. |

The server reads process environment variables. It does not automatically load `.env` files. Restart the server after configuration changes. OpenAI API billing is separate from a ChatGPT subscription.

## Google Drive setup

1. Create or select a project in Google Cloud Console and enable **Google Drive API**.
2. Configure the Google OAuth consent screen. For a pilot in Testing mode, add the intended Google accounts as test users.
3. Create an OAuth client of type **Web application**.
4. Register the authorized redirect URI exactly as `APP_URL` followed by `/auth/google/callback`. For local development on the default port, this is `http://localhost:3000/auth/google/callback`. Register the deployed HTTPS callback separately when deploying.
5. Configure the client ID and secret securely on the server and set `APP_URL` to the matching origin.
6. Open the app, choose **Connect Google Drive**, and complete Google's consent flow.
7. Save a study. The app locates or creates an **Abide Bible Studies** folder accessible to this application, then converts the study into a Google Doc within that folder. Open the returned document and folder links to verify the save.

The requested scope is `https://www.googleapis.com/auth/drive.file`. It limits access to files created by or explicitly opened with this app. The application cannot discover every similarly named folder in your Drive under this scope. The Google Docs API is not required for the current save mechanism: it creates Google Docs by uploading HTML through the Drive API.

Google test-mode authorizations can expire; reconnect when prompted. Disconnecting the app's session is separate from revoking the app's permission in your Google Account settings.

## Network destinations

The server needs HTTPS access to:

- `bible-api.com` for Bible passages.
- `api.openai.com` for AI conversations.
- `oauth2.googleapis.com` for Google token exchange and refresh.
- `www.googleapis.com` for Drive folder lookup and document creation.

The user's browser visits `accounts.google.com` for authorization and `drive.google.com` / `docs.google.com` for saved studies. Configure allowed destinations through the host's supported settings; saving an allowlist does not establish that live API operations have succeeded.

## Live acceptance checks

These checks require real configured accounts and are separate from mocked automated tests:

1. Select a different book/chapter/verse and translation; verify the fetched reference and text.
2. Add the passage to chat, select a study topic, and receive an actual OpenAI response. Send a follow-up and verify conversational context.
3. Connect Google Drive and save a study containing the passage, translation, conversation, and notes.
4. Open the saved Google Doc and folder; verify the content and location.
5. Reconnect after a server restart and verify a new save.

## Pilot and deployment limits

Run this version as a private pilot. Production requires APP_ACCESS_PASSWORD; sign in with username abide and that password. This shared access password and per-session limits do not provide individual account quotas. Before broader public release, add individual authentication and durable user-based quotas. See DEPLOY.md for Render deployment.

Google tokens and sessions are stored only in server memory. A restart or session expiration requires reconnection. Use a single server instance for this pilot; multiple instances require a shared session store. A production version should persist tokens encrypted, rotate session IDs after sign-in, and provide durable save idempotency and an account-aware study index.

The AI uses model knowledge rather than live web research. Historical and manuscript answers require source verification. The initial 66-book reader follows the Protestant canon; additional canons and licensed translations need explicit provider support.
