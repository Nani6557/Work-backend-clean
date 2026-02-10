Backend for Mobile + HTML frontends
==================================

How to use:
1. Copy files to your backend folder.
2. Create a `.env` file (copy `.env.example`) and fill in your real credentials later.
3. Install dependencies:
   npm install
4. Start server in dev:
   npm run dev
   or production:
   npm start

API endpoints (local-mode / placeholder behavior; works without real credentials):
- GET  /health
- POST /auth/login         -> { phone }        (checks users collection)
- POST /otp/send          -> { phone }        (sends OTP via Twilio - returns OTP in dev)
- POST /user/register     -> user object      (stores to Firestore if configured or in-memory fallback)
- GET  /user/workers      -> list workers
- GET  /user/workers/:id  -> worker
- POST /user/upload       -> { filename, base64 } (saves to Firebase Storage if configured, otherwise returns data URI)
- GET  /agora/token?channel=chan&uid=1 -> returns { token, uid }

Notes:
- This backend uses Firebase Admin if you provide a service account JSON and set GOOGLE_APPLICATION_CREDENTIALS.
- Twilio and Agora will work when you fill .env with real credentials.
- For development it has safe fallbacks when Firebase is not configured.
