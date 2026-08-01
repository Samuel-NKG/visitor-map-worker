/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * Endpoints:
 *   POST /hit     - Record a visitor (geo from Cloudflare request.cf)
 *   GET  /cities  - Get recent visitor cities (for the map)
 *
 * Bindings needed:
 *   - KV namespace: VISITORS
 *   - Environment variable (optional): ALLOWED_ORIGIN = https://www.samuelnkg.com
 */

const MAX_CITIES = 120; // Keep only the latest N visits

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

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
  // Prefer Cloudflare edge geo (works worldwide, including mainland China)
  const cf = request.cf || {};

  let city = (cf.city || "").toString().trim().slice(0, 64);
  let countryCode = (cf.country || "").toString().trim().slice(0, 8).toUpperCase();
  let country = countryCode; // CF gives ISO code; frontend can show code fine
  let lat = Number(cf.latitude);
  let lng = Number(cf.longitude);

  // Optional body override (rarely needed)
  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      if (body.city) city = String(body.city).trim().slice(0, 64);
      if (body.country) country = String(body.country).trim().slice(0, 64);
      if (body.countryCode) countryCode = String(body.countryCode).trim().slice(0, 8).toUpperCase();
      if (Number.isFinite(Number(body.lat))) lat = Number(body.lat);
      if (Number.isFinite(Number(body.lng))) lng = Number(body.lng);
    }
  } catch {
    // no body is fine
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    lat = null;
    lng = null;
  }

  if (!city && !countryCode && lat === null) {
    return json({ error: "Unable to resolve location" }, 400, corsHeaders);
  }

  const key = `${countryCode || country}|${city || "Unknown"}`;
  const now = Date.now();

  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

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

  return json({ ok: true, city: city || "Unknown", countryCode }, 200, corsHeaders);
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
