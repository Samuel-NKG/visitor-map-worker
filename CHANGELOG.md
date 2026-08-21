# Changelog

## 2026-08-21

### Added
- Admin dashboard **interactive map** (Leaflet), same idea as the homepage visitor map; marker size scales with visit count.
- **Bot filtering**: `POST /hit` skips User-Agents matching bot/crawler patterns; `/cleanup` and `/cities` purge historical bot rows.
- **China city coordinates** expanded to prefecture-level (市级) using [lomocc admin-division gist](https://gist.github.com/lomocc/37694c33ff090fb9a0efe092202c0a48); districts/counties ignored.
- Dashboard button **清洗 Bot** calling `POST /cleanup`.

### Deploy
1. Replace Worker code with latest `src/index.js` (or paste from release notes / local copy).
2. Save and Deploy.
3. Open `/dashboard` → click **清洗 Bot**, or `POST https://your-worker/cleanup`.
