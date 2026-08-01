/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * Endpoints:
 *   POST /hit     - Record a visitor city (called by frontend)
 *   GET  /cities  - Get recent visitor cities (for the map)
 *
 * Bindings needed:
 *   - KV namespace: VISITORS
 *   - Environment variable (optional): ALLOWED_ORIGIN = https://www.samuelnkg.com
 */

const MAX_CITIES = 80; // Keep only the latest N cities

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // CORS
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin":
        allowedOrigin === "*" ? "*" : origin === allowedOrigin ? allowedOrigin : "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (url.pathname === "/hit" && request.method === "POST") {
        return await handleHit(request, env, corsHeaders);
      }

      if (url.pathname === "/cities" && request.method === "GET") {
        return await handleCities(env, corsHeaders);
      }

      return json({ error: "Not found" }, 404, corsHeaders);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal error" }, 500, corsHeaders);
    }
  },
};

async function handleHit(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const city = (body.city || "").trim().slice(0, 64);
  const country = (body.country || "").trim().slice(0, 64);
  const countryCode = (body.countryCode || "").trim().slice(0, 8).toUpperCase();

  // Optional coordinates (from IP geolocation)
  let lat = Number(body.lat);
  let lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    lat = null;
    lng = null;
  } else {
    // basic sanity range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      lat = null;
      lng = null;
    }
  }

  if (!city && !country && lat === null) {
    return json({ error: "Missing city/country" }, 400, corsHeaders);
  }

  const key = `${countryCode || country}|${city || "Unknown"}`;
  const now = Date.now();

  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  // Always record every visit
  list.unshift({
    key,
    city: city || "Unknown",
    country: country || "",
    countryCode: countryCode || "",
    lat,
    lng,
    ts: now,
  });

  if (list.length > MAX_CITIES) {
    list = list.slice(0, MAX_CITIES);
  }

  await env.VISITORS.put("cities", JSON.stringify(list));

  return json({ ok: true }, 200, corsHeaders);
}

async function handleCities(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  const cities = list.map((item) => ({
    city: item.city,
    country: item.country,
    countryCode: item.countryCode,
    lat: item.lat,
    lng: item.lng,
    ts: item.ts,
  }));

  return json({ cities }, 200, corsHeaders);
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
