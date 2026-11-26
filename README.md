# HiClippy 🌿

**HiClippy** is a nature-themed online clipboard. Share text, links, images and files up to 10MB with a 4-digit code: no accounts, no logins. Everything is deleted automatically when it expires.

## ✨ Features

- 🔢 **4-digit codes** - Share on one device, enter the code on another to get it back.
- 👀 **Previews before download** - Images, video, audio, PDFs, text/code files and CSV tables can be viewed in the page, with a full-screen view, before you download.
- ⏱️ **Auto-destruct** - Pick an expiry of 1, 5 or 10 minutes. Expired pastes are removed by a MongoDB TTL index plus a cleanup job that runs every minute.
- 🌾 **Procedural meadow** - Hills, grass and flowers are generated on each page load.
- 🐱 **Animated mascot** - A looping WebM mascot (`frontend/public/images/tom.webm`).
- 🛡️ **Abuse protection** - Per-device fingerprint (a hash of IP + User-Agent + Accept-Language): 5 uploads per minute and 20 per hour, and 30 wrong codes per 10 minutes. Only the uploading device can delete a paste.
- 🐳 **Docker-ready** - Nginx + Node.js + MongoDB through Docker Compose.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite 6, React Router 7, Framer Motion, Tailwind CSS, lucide-react, axios.
- **Backend:** Node.js 22, Express 4, Mongoose 8, Multer 2 (in-memory uploads), express-rate-limit, node-cron.
- **Database:** MongoDB via Mongoose. Files are stored as base64 inside the paste document.
- **Infrastructure:** Nginx (static files and `/api` reverse proxy), Docker, Docker Compose. The frontend is also set up for Vercel (`frontend/vercel.json`).

## 📡 API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/paste` | Multipart or form body: `content` or `file`, `contentType` (`text`, `link`, `image`, `file`), `duration` (minutes). Returns `{ id, expiresAt, expiryMinutes }`. |
| `GET` | `/api/paste/:id` | Returns the paste. Files come back as base64 `content` with `fileName`, `fileSize` and `mimeType`. Add `?meta=1` to leave out `content` for files. |
| `GET` | `/api/paste/:id/raw` | The paste's raw bytes as a download (`Content-Disposition: attachment`, `nosniff`, sandbox CSP). |
| `DELETE` | `/api/paste/:id` | Deletes a paste. Only works from the device that uploaded it; otherwise returns 404. |
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

To run the whole stack in Docker instead, put `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` in a `.env` file next to `docker-compose.yml` (see `.env.example`), then run `docker compose up --build` and open http://localhost:3000.

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
| `LOOKUP_LIMIT_WINDOW_MS` | `600000` | Window for counting wrong codes |
| `LOOKUP_LIMIT_MAX_FAILURES` | `30` | Wrong codes allowed per window per fingerprint |
| `TRUST_PROXY` | `1` | Express `trust proxy` setting: number of proxy hops in front of the API (1 for Render or the bundled nginx) |

---

## 👨‍💻 Developed by
**Itesh Tomar**
- [GitHub](https://github.com/iteshxt)
- [Website](https://iteshxt.me)
- [Email](mailto:mail.iteshxt@gmail.com)

---

## 📜 License
MIT License. Crafted with ❤️ for a better sharing experience.
