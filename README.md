# Visitor Map Worker

最近心血来潮写了个个人主页，作为一个自诩的地理爱好者，非常希望在个人主页里面插入一个访客来源的可视化地图，但是发现……

MapMyVisitors → 一开始用的这个，结果第二天就挂了

RevolverMaps → 2024 年底已经关闭

ClustrMaps → 也挂了

算了，给马斯克充的钱不能白冲，让Grok忙一下，给我写一个吧。

---

## Overview

**Visitor Map Worker** is a self-hosted, city-level visitor origin tracker built on **Cloudflare Workers + KV**. It is designed for personal sites and static blogs that want a lightweight “where visitors come from” map without relying on third-party map widgets that disappear overnight.

| | |
|---|---|
| **Demo site** | [samuelnkg.com](https://www.samuelnkg.com) |
| **Live API** | [`https://map.samuelnkg.com/cities`](https://map.samuelnkg.com/cities) |
| **Admin UI** | [`https://map.samuelnkg.com/`](https://map.samuelnkg.com/) (or `/dashboard`) |
| **License** | [MIT](./LICENSE) |

This project was implemented end-to-end with **Grok 4.5**.

### What you get out of the box

| Capability | Included | Notes |
|---|---|---|
| City-level visit recording API | Yes | `POST /hit`, `GET /cities` |
| Interactive map rendering | Yes | [`frontend/visitor-map.js`](./frontend/visitor-map.js) |
| Auto Leaflet injection | Yes | CDN loaded by the module |
| Marker radius ∝ visit count | Yes | Built-in aggregation |
| CN city name / mojibake fixes | Yes | Coord-first snap + name map |
| Visit timestamps (GMT + Beijing) | Yes | Stored and returned by API |
| Full admin dashboard | Yes | IP, ASN, colo, UA, Referer, … |
| Zero third-party map SaaS | Yes | Your Worker, your KV, your data |

You do **not** need to:

- pick and wire a map SDK yourself;
- write `L.map` / `circleMarker` boilerplate;
- invent aggregation logic for Chinese city aliases or garbled labels.

Each deployment is independent: friends who fork the project use **their own** Worker URL and KV. Nothing is shared with `samuelnkg.com`.

---

## Architecture

```text
Browser (your site)
  ├─ visitor-map.js  ──POST /hit──►  Cloudflare Worker
  │                      │                │
  │                      │                ├─ request.cf + optional CN IP refine
  │                      │                ├─ normalize city / coords
  │                      │                └─ append to KV (VISITORS)
  │                      │
  └─ visitor-map.js  ──GET /cities──►  Worker ──► JSON city list
         │
         └─ Leaflet markers (size by count)

Admin browser ──GET / or /dashboard──► same Worker ──► HTML table (all fields)
```

- **Runtime:** Cloudflare Workers (edge)
- **Storage:** one KV namespace, binding name **`VISITORS`**, key `cities` (JSON array, newest first, capped)
- **Geo sources:** Cloudflare `request.cf`, plus optional refinement for CN/HK/MO/TW via public IP lookup APIs

---

## Quick start (map in ~5 minutes)

### 1. Deploy the Worker

1. Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Create a **KV** namespace (e.g. `visitor-cities`).
3. Create a **Worker**, paste [`src/index.js`](./src/index.js), **Save and Deploy**.
4. Under Worker **Settings → Bindings**, add KV binding:
   - Variable name: **`VISITORS`** (must match exactly)
   - Namespace: the KV you created
5. Copy the Worker URL, e.g. `https://visitor-map-worker.<account>.workers.dev`  
   (optional) attach a custom domain such as `map.example.com`.

### 2. Embed the map on any page

```html
<div id="visitor-map" style="height: 360px; width: 100%;"></div>

<script src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"></script>
<script>
  VisitorMap.mount({
    workerUrl: "https://你的Worker地址", // no trailing slash
    container: "#visitor-map",
  });
</script>
```

On load the module will:

1. inject Leaflet if needed;
2. `POST /hit` to record the current visit;
3. `GET /cities` and draw circle markers (radius scales with visit frequency).

### 3. Attribute-only embed (no `mount` call)

```html
<div
  data-visitor-map
  data-worker-url="https://你的Worker地址"
  style="height: 360px; width: 100%"
></div>
<script
  src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"
  defer
></script>
```

### 4. Local examples

```bash
git clone https://github.com/Samuel-NKG/visitor-map-worker.git
cd visitor-map-worker
# edit WORKER_URL inside examples/plug-and-play.html, then open in a browser
```

| File | Purpose |
|---|---|
| [`examples/plug-and-play.html`](./examples/plug-and-play.html) | Recommended full demo |
| [`examples/minimal.html`](./examples/minimal.html) | Minimal inline reference |

Long-form Chinese walkthrough: [USAGE.zh-CN.md](./USAGE.zh-CN.md).

---

## Frontend module API

Source: [`frontend/visitor-map.js`](./frontend/visitor-map.js).

You may also host the file on your own origin and load it via a relative path (no jsDelivr dependency).

```js
VisitorMap.mount({
  workerUrl: "https://xxx.workers.dev", // required
  container: "#visitor-map",            // required: selector or Element
  report: true,                         // POST /hit on mount
  loadLeaflet: true,                    // auto-inject Leaflet CSS/JS
  markerColor: "#ff6b2c",
  height: 360,
  onLoad: (cities) => {},
  onError: (err) => {},
});
// => Promise<{ map, layer, reload, destroy }>
```

---

## Backend API

Base URL = your Worker origin (or custom domain).

| Method | Path | Description |
|---|---|---|
| `GET` | `/` or `/dashboard` | Admin HTML table (all stored fields) |
| `POST` | `/hit` | Record one visit |
| `GET` | `/cities` | Recent visits as JSON (auto-migrates bad city labels on read) |
| `GET` / `POST` | `/cleanup` | Force rewrite / clean historical entries |
| `OPTIONS` | `*` | CORS preflight |

### `POST /hit`

- Location is derived primarily from Cloudflare `request.cf`.
- For CN / HK / MO / TW (or missing city), the Worker may refine via public IP geolocation.
- City names are normalized; coordinates may be snapped to a known CN city table when appropriate.
- **Request body is optional.** If JSON is sent, `city` / `lat` / `lng` / `country` / `countryCode` can override derived values.

Example response:

```json
{
  "ok": true,
  "city": "San Jose",
  "region": "California",
  "countryCode": "US",
  "ts": 1785595705390,
  "timeGMT": "2026-08-03 17:28:25 GMT",
  "timeBeijing": "2026-08-04 01:28:25 CST"
}
```

### `GET /cities`

```json
{
  "cities": [
    {
      "city": "San Jose",
      "region": "California",
      "country": "US",
      "countryCode": "US",
      "lat": 37.3382,
      "lng": -121.8863,
      "ts": 1785595705390,
      "timeGMT": "...",
      "timeBeijing": "...",
      "ip": "...",
      "asn": 12345,
      "asOrg": "...",
      "colo": "SJC",
      "timezone": "America/Los_Angeles",
      "continent": "NA",
      "httpProtocol": "HTTP/2",
      "tlsVersion": "TLSv1.3",
      "postalCode": "",
      "userAgent": "...",
      "referer": "..."
    }
  ]
}
```

Field reference: **[FIELDS.md](./FIELDS.md)**.

### CORS / origin lock

Optional Worker environment variable:

| Variable | Meaning |
|---|---|
| `ALLOWED_ORIGIN` | If set (e.g. `https://www.example.com`), only that origin receives `Access-Control-Allow-Origin`. Default `*` for personal use. |

### Wrangler CLI deploy

```bash
npm install
npx wrangler login
npx wrangler kv namespace create visitor-cities
# put the returned id into wrangler.toml
npx wrangler deploy
```

---

## Admin dashboard

After deploy, open:

- `https://你的Worker域名/`
- or `https://你的Worker域名/dashboard`

You will see a searchable table of recent visits, including timestamps, city, coordinates, **IP**, **ASN / ISP**, colo, timezone, protocol, TLS, **User-Agent**, and **Referer**.

Notes:

- Records written **before** upgrading the Worker will show `—` for the newer fields.
- The public map module only plots city markers; it does **not** surface IP or UA on the map itself.
- Standalone HTML (for static hosting / jsDelivr): [`frontend/dashboard.html`](./frontend/dashboard.html)  
  Optional query: `?api=https://你的Worker/cities`

More detail: [DASHBOARD.md](./DASHBOARD.md).

---

## Privacy & accuracy

**Default product intent:** city-level origins for a personal homepage map — not a commercial analytics suite.

| Topic | Behavior |
|---|---|
| Precision | City / region level from IP intelligence, **not** GPS |
| GPS | Not requested; browser geolocation is intentionally out of scope |
| Identity | No accounts, no first-party user IDs |
| Cookies | None required by this Worker |
| IP / UA / Referer | Stored when using the full [`src/index.js`](./src/index.js) for the **admin dashboard**; treat as sensitive and only expose the Worker admin URL to yourself |
| Accuracy limits | Mobile carriers and some ISPs geolocate to provincial capitals or backbone cities; the Worker applies CN name maps and coord snapping where possible |
| Retention | In-memory style list in KV, truncated to the latest ~120 entries (`MAX_CITIES`) |

If you publish a site for others, document what you collect and consider restricting `ALLOWED_ORIGIN` and who can open `/dashboard`.

---

## Repository layout

```text
visitor-map-worker/
├── src/index.js                 # Cloudflare Worker (API + embedded dashboard)
├── frontend/
│   ├── visitor-map.js           # Plug-and-play map module
│   └── dashboard.html           # Standalone admin UI (optional)
├── examples/
│   ├── plug-and-play.html       # Full map demo
│   ├── minimal.html
│   └── frontend-snippet.js
├── FIELDS.md                    # Stored / returned field list
├── DASHBOARD.md                 # Admin UI notes
├── USAGE.zh-CN.md               # Chinese setup guide
├── SYNC.md                      # How to sync a live Worker back into git
├── wrangler.toml
├── package.json
├── LICENSE
└── README.md
```

---

## Troubleshooting

| Symptom | Likely cause | What to try |
|---|---|---|
| Map empty | Wrong `workerUrl` or CORS | Open `/cities` in the browser; check Network tab for `/hit` |
| `VISITORS is not defined` | KV binding missing / wrong name | Binding variable must be exactly `VISITORS` |
| City always a capital | Carrier-grade NAT / coarse IP DB | Expected limitation; refinement helps but is imperfect |
| Dashboard columns are `—` | Old KV rows before schema upgrade | New visits after Deploy fill the new fields |
| SyntaxError `list already declared` | Duplicate `let list` after a bad paste | Keep a single `let list = []` in `handleHit` |
| Mainland access blocked on custom domain | DNS / proxy / ICP unrelated to this repo | Use `*.workers.dev` for testing |

---

## Related docs

- [USAGE.zh-CN.md](./USAGE.zh-CN.md) — 中文使用步骤
- [FIELDS.md](./FIELDS.md) — 字段说明
- [DASHBOARD.md](./DASHBOARD.md) — 明细页
- [SYNC.md](./SYNC.md) — 将 Cloudflare 线上代码同步回仓库

---

## License

[MIT](./LICENSE)
