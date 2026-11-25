# HiClippy 🌿

**HiClippy** is a nature-themed online clipboard. Share text, links, images and files up to 10MB with a 4-digit code: no accounts, no logins. Everything is deleted automatically when it expires.

## ✨ Features

- 🔢 **4-digit codes** - Share on one device, enter the code on another to get it back.
- 👀 **Previews before download** - Images, video, audio, PDFs, text/code files and CSV tables can be viewed in the page, with a full-screen view, before you download.
- ⏱️ **Auto-destruct** - Pick an expiry of 1, 5 or 10 minutes. Expired pastes are removed by a MongoDB TTL index plus a cleanup job that runs every minute.
- 🌾 **Procedural meadow** - Hills, grass and flowers are generated on each page load.
- 🐱 **Animated mascot** - A looping WebM mascot (`frontend/public/images/tom.webm`).
- 🛡️ **Upload rate limits** - Per browser fingerprint (a hash of User-Agent + Accept-Language): 5 uploads per minute and 20 per hour by default.
- 🐳 **Docker-ready** - Nginx + Node.js + MongoDB through Docker Compose.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite 4, React Router 7, Framer Motion, Tailwind CSS, lucide-react, axios.
- **Backend:** Node.js, Express 4, Multer (in-memory uploads), express-rate-limit, node-cron.
- **Database:** MongoDB via Mongoose. Files are stored as base64 inside the paste document.
- **Infrastructure:** Nginx (static files and `/api` reverse proxy), Docker, Docker Compose. The frontend is also set up for Vercel (`frontend/vercel.json`).

## 📡 API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/paste` | Multipart or form body: `content` or `file`, `contentType` (`text`, `link`, `image`, `file`), `duration` (minutes). Returns `{ id, expiresAt, expiryMinutes }`. |
| `GET` | `/api/paste/:id` | Returns the paste. Files and images come back as base64 with `fileName` and `mimeType`. |
| `DELETE` | `/api/paste/:id` | Deletes a paste. |
| `GET` | `/health` | Health check. |

Expiry is capped by `PASTE_MAX_EXPIRY_MINUTES` (default 1440). The UI offers 1, 5 and 10 minutes.

## 🚀 Running locally

```bash
# 1. Backend (needs a MongoDB; see .env.example)
cd backend
cp ../.env.example .env   # then set MONGO_URI
npm install
npm run dev               # http://localhost:3001

# 2. Frontend
cd ../frontend
npm install
npm run dev               # http://localhost:3000
```

The frontend calls `VITE_API_URL` (default `http://localhost:3001`).

To run the whole stack in Docker instead: `docker compose up --build`, then open http://localhost:3000.

### Tests

```bash
cd backend && MONGO_URI=mongodb://localhost:27017 npm test
```

Tests need a running MongoDB at `MONGO_URI` (from the environment or `backend/.env`). They use a separate `clippy_test` database and drop it when they finish.

### Environment variables (backend)

| Variable | Default | Meaning |
| --- | --- | --- |
| `MONGO_URI` | none | MongoDB connection string |
| `BACKEND_PORT` | `3001` | API port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origins, comma-separated, or `*` |
| `MAX_FILE_SIZE_MB` | `10` | Upload size limit |
| `RATE_LIMIT_BURST_MAX` | `5` | Uploads per minute per fingerprint |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Window for the hourly limit |
| `RATE_LIMIT_MAX_REQUESTS` | `20` | Uploads per window per fingerprint |
| `PASTE_DEFAULT_EXPIRY_MINUTES` | `60` | Expiry used when none is sent |
| `PASTE_MAX_EXPIRY_MINUTES` | `1440` | Highest expiry the API accepts |

---

## 👨‍💻 Developed by
**Itesh Tomar**
- [GitHub](https://github.com/iteshxt)
- [Website](https://iteshxt.me)
- [Email](mailto:iteshxt@gmail.com)

---

## 📜 License
MIT License. Crafted with ❤️ for a better sharing experience.
