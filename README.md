# Visitor Map Worker

A **serverless visitor origin tracker** built on **Cloudflare Workers + KV**.

It records **city-level** visit locations (not precise GPS), exposes a tiny JSON API, and pairs cleanly with a Leaflet map on any static site (GitHub Pages, Hexo, Hugo, plain HTML, etc.).

> Live example: [samuelnkg.com](https://www.samuelnkg.com) → Website Data → Visitor Origins  
> API demo: `https://map.samuelnkg.com/cities`

---

## Features

| Feature | Description |
|--------|-------------|
| City-level geo | Uses Cloudflare `request.cf` + optional China IP refinement |
| No database server | Cloudflare KV only |
| CORS ready | Call from any frontend |
| History cleanup | Auto-fix garbled / province-only names; `/cleanup` endpoint |
| Frequency-friendly | Frontend can size markers by visit count |
| Free tier friendly | Fits Cloudflare Workers free plan for personal sites |

**Endpoints**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/hit` | Record one visit (geo from edge / client IP) |
| `GET` | `/cities` | Recent visits (also migrates bad historical names) |
| `GET`/`POST` | `/cleanup` | Force rewrite all stored city labels |
| `OPTIONS` | `*` | CORS preflight |

**Privacy note:** Only city / region / country codes and approximate coordinates derived from IP are stored. No cookies, no user IDs, no exact street-level location.

**Accuracy note:** IP geolocation is approximate. In mainland China, some ISP ranges map to provincial capitals (e.g. Ningbo → Hangzhou). The worker tries to improve this with secondary lookups and a known-city coordinate table, but **city-level accuracy is not guaranteed**.

---

## Quick start (Dashboard, ~10 minutes)

### 1. Cloudflare account

Sign up / log in: [https://dash.cloudflare.com](https://dash.cloudflare.com) (free plan is enough).

### 2. Create a KV namespace

1. **Workers & Pages** → **KV**
2. **Create a namespace**, e.g. `visitor-cities`
3. Copy the **Namespace ID** (optional if you only bind in the UI)

### 3. Create the Worker

1. **Workers & Pages** → **Create** → **Create Worker**
2. Name it, e.g. `visitor-map-worker` → **Deploy**
3. Open the worker → **Edit code**
4. Delete the default code and paste the full contents of [`src/index.js`](./src/index.js)
5. **Save and Deploy**

### 4. Bind KV

1. Worker → **Settings** → **Bindings** → **Add** → **KV Namespace**
2. Variable name: **`VISITORS`** (must match exactly)
3. Select the namespace from step 2
4. Save

### 5. (Optional) Restrict CORS

Worker → **Settings** → **Variables** → add:

| Type | Name | Value |
|------|------|--------|
| Text | `ALLOWED_ORIGIN` | `https://your-site.com` |

If unset, CORS allows `*`.

### 6. Get your Worker URL

After deploy you get something like:

```text
https://visitor-map-worker.<your-subdomain>.workers.dev
```

Optional: attach a custom domain under **Triggers** / **Custom Domains** (e.g. `map.example.com`).

### 7. Smoke test

```bash
# Record a visit
curl -X POST "https://YOUR_WORKER_URL/hit" \
  -H "Content-Type: application/json" \
  -d '{}'

# List cities
curl "https://YOUR_WORKER_URL/cities"

# Optional: clean historical labels
curl "https://YOUR_WORKER_URL/cleanup"
```

You should see JSON like `{ "ok": true, "city": "..." }` and `{ "cities": [ ... ] }`.

---

## Deploy with Wrangler (CLI)

```bash
git clone https://github.com/Samuel-NKG/visitor-map-worker.git
cd visitor-map-worker
npm install

# Login once
npx wrangler login

# Create KV and put the id into wrangler.toml
npx wrangler kv namespace create visitor-cities
# Edit wrangler.toml → replace YOUR_KV_NAMESPACE_ID

npx wrangler deploy
```

`wrangler.toml`:

```toml
name = "visitor-map-worker"
main = "src/index.js"
compatibility_date = "2024-09-01"

[[kv_namespaces]]
binding = "VISITORS"
id = "YOUR_KV_NAMESPACE_ID"

# [vars]
# ALLOWED_ORIGIN = "https://www.example.com"
```

---

## Frontend integration

### Minimal: report + list

```html
<script>
  const WORKER_URL = "https://YOUR_WORKER_URL"; // no trailing slash

  // 1) record this visit
  fetch(WORKER_URL + "/hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => {});

  // 2) load cities for your UI / map
  fetch(WORKER_URL + "/cities")
    .then((r) => r.json())
    .then((data) => {
      console.log(data.cities);
      // each item: { city, region, country, countryCode, lat, lng, ts }
    })
    .catch(() => {});
</script>
```

### Leaflet map (recommended)

See a complete copy-paste example:

- [`examples/minimal.html`](./examples/minimal.html) — standalone dark map page
- [`examples/frontend-snippet.js`](./examples/frontend-snippet.js) — drop into an existing site

Typical flow:

1. Load Leaflet CSS/JS (CDN)
2. `POST /hit` once per page load
3. `GET /cities`
4. Group by **coordinates first**, then pick the best city name (avoids China duplicate place-names and garbled labels)
5. Draw `L.circleMarker` with radius ∝ √count

---

## API reference

### `POST /hit`

Body optional JSON:

```json
{ "city": "Nanjing", "countryCode": "CN", "lat": 32.06, "lng": 118.8 }
```

Usually send `{}` and let the Worker resolve geo from the request IP / Cloudflare edge.

**Response**

```json
{ "ok": true, "city": "Nanjing", "region": "Jiangsu", "countryCode": "CN" }
```

### `GET /cities`

```json
{
  "cities": [
    {
      "city": "Nanjing",
      "region": "Jiangsu",
      "country": "China",
      "countryCode": "CN",
      "lat": 32.0603,
      "lng": 118.7969,
      "ts": 1785600000000
    }
  ]
}
```

- Newest first
- Cap: last **120** visits (configurable via `MAX_CITIES` in `src/index.js`)
- On read, bad labels may be rewritten into KV automatically

### `GET` or `POST` `/cleanup`

Rewrites all stored entries (garbled → nearest known city by coordinates).

```json
{ "ok": true, "total": 42, "sample": [ { "city": "Ningbo", "lat": 29.87, "lng": 121.54 } ] }
```

---

## Project layout

```text
visitor-map-worker/
├── src/index.js          # Worker source (single file)
├── wrangler.toml         # Wrangler config + KV binding
├── package.json
├── examples/
│   ├── minimal.html      # Full demo page
│   └── frontend-snippet.js
├── LICENSE               # MIT
└── README.md
```

---

## Custom domain (optional)

1. Add your domain to Cloudflare DNS
2. Worker → **Triggers** → **Custom Domains** → Add `map.yourdomain.com`
3. Point frontend `WORKER_URL` to that host

Useful if `workers.dev` is slow or blocked on some networks.

---

## Limits & costs

- Designed for the **Cloudflare free tier** (personal / small sites)
- Secondary geo APIs (`pconline`, `ip-api.com`) have their own rate limits
- Do not use this as a high-security analytics product; it is a **lightweight origin map**

---

## Roadmap ideas

- [ ] Optional per-day aggregation mode
- [ ] Admin token for `/cleanup`
- [ ] Embeddable Web Component for the map

PRs welcome.

---

## License

[MIT](./LICENSE)

---

## 中文简要说明

这是一个基于 **Cloudflare Workers + KV** 的访客来源（城市级）统计后端：

1. 在 Cloudflare 创建 KV，绑定名为 **`VISITORS`**
2. 把 [`src/index.js`](./src/index.js) 部署为 Worker
3. 前端 `POST /hit` 记一次访问，`GET /cities` 取列表
4. 用 Leaflet 画点；圆点大小可表示次数
5. 乱码历史可用 `/cleanup` 或打开 `/cities` 自动纠正

适合个人主页 / 静态博客，不需要自己的服务器。
