# LinkedIn Automation Bridge

A secure, production-ready Next.js API bridge for publishing automated posts to LinkedIn via the Publora API:

**ChatGPT / OpenAI → Vercel → Publora → LinkedIn**

---

## Architecture Overview

1. **Automation Trigger**: Your external client, AI workflow (e.g., ChatGPT Actions, Make, Zapier, Python scripts), or cron job makes an authenticated HTTP request to this bridge.
2. **Next.js Bridge (Vercel)**:
   - Validates the incoming bearer token (`Authorization: Bearer <BRIDGE_SECRET>`) with constant-time comparison.
   - Validates the payload (`content` non-empty string).
   - Keeps your `PUBLORA_API_KEY` and `LINKEDIN_PLATFORM_ID` secure on the server.
3. **Publora API**: The server transmits the post to `POST https://api.publora.com/api/v1/create-post` targeting your LinkedIn connection.
4. **LinkedIn**: Publora securely publishes the post to your connected LinkedIn profile or page.

---

## Environment Variables

Configure these environment variables in `.env.local` for local development or in Vercel Project Settings for production:

| Variable | Description |
|---|---|
| `PUBLORA_API_KEY` | Your Publora API secret key (`x-publora-key`). |
| `LINKEDIN_PLATFORM_ID` | The ID of your connected LinkedIn platform in Publora. |
| `BRIDGE_SECRET` | A secure bearer token you choose to protect this bridge API from unauthorized calls. |

See `.env.example` for a template:
```env
PUBLORA_API_KEY=
LINKEDIN_PLATFORM_ID=
BRIDGE_SECRET=
```

> **Security Note:** Never commit `.env.local` or any secrets to source control.

---

## Running Locally

1. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```env
   PUBLORA_API_KEY=your_publora_api_key_here
   LINKEDIN_PLATFORM_ID=your_linkedin_platform_id_here
   BRIDGE_SECRET=your_custom_bridge_secret_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. The server runs at `http://localhost:3000`.

---

## API Endpoints

### 1. Health Check
Checks if the service is running. No authorization required.

- **URL:** `GET /api/health`
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "linkedin-automation"
  }
  ```

### 2. Publish to LinkedIn
Publishes post content to LinkedIn via Publora.

- **URL:** `POST /api/publish`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <BRIDGE_SECRET>`
- **Request Body:**
  ```json
  {
    "content": "Excited to share our latest project update!"
  }
  ```
- **Optional Request Body Fields:**
  - `scheduledTime`: An ISO 8601 UTC timestamp (e.g. `"2026-03-25T15:00:00.000Z"`). If omitted, the post is automatically scheduled with a 60-second buffer for immediate publication.

#### Example `curl` Command:

```bash
curl -X POST http://localhost:3000/api/publish \
  -H "Authorization: Bearer YOUR_BRIDGE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello LinkedIn from my automated publishing bridge!"
  }'
```

---

## Deploying to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. In **Settings → Environment Variables**, add:
   - `PUBLORA_API_KEY`
   - `LINKEDIN_PLATFORM_ID`
   - `BRIDGE_SECRET`
4. Deploy the project.
5. Once deployed, test your production endpoint using your Vercel domain:
   ```bash
   curl -X POST https://your-project.vercel.app/api/publish \
     -H "Authorization: Bearer YOUR_BRIDGE_SECRET" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Testing automated post from Vercel bridge."
     }'
   ```
