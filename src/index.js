/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * POST /hit   - Record a visitor
 * GET  /cities - List recent cities
 *
 * Geo strategy:
 *   1) Cloudflare request.cf (fast, works worldwide)
 *   2) For CN (and missing city): refine with ip-api.com using client IP
 *      — better city accuracy inside mainland China
 *
 * Binding: KV namespace VISITORS
 */

const MAX_CITIES = 120;

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
  const cf = request.cf || {};
  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    "";

  let city = (cf.city || "").toString().trim().slice(0, 64);
  let region = (cf.region || "").toString().trim().slice(0, 64);
  let countryCode = (cf.country || "").toString().trim().slice(0, 8).toUpperCase();
  let country = countryCode;
  let lat = Number(cf.latitude);
  let lng = Number(cf.longitude);

  // Body override (optional)
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

  // Mainland China: CF city is often wrong (e.g. Nanjing -> Shanghai).
  // Refine with ip-api using the real client IP.
  const needRefine =
    countryCode === "CN" ||
    !city ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng);

  if (needRefine && clientIp) {
    const refined = await refineGeo(clientIp);
    if (refined) {
      if (refined.city) city = refined.city;
      if (refined.region) region = refined.region;
      if (refined.countryCode) countryCode = refined.countryCode;
      if (refined.country) country = refined.country;
      if (Number.isFinite(refined.lat)) lat = refined.lat;
      if (Number.isFinite(refined.lng)) lng = refined.lng;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    lat = null;
    lng = null;
  }

  if (!city && !countryCode && lat === null) {
    return json({ error: "Unable to resolve location" }, 400, corsHeaders);
  }

  const key = `${countryCode || country}|${city || region || "Unknown"}`;
  const now = Date.now();

  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  list.unshift({
    key,
    city: city || region || "Unknown",
    region: region || "",
    country: country || "",
    countryCode: countryCode || "",
    lat,
    lng,
    ts: now,
  });

  if (list.length > MAX_CITIES) list = list.slice(0, MAX_CITIES);

  await env.VISITORS.put("cities", JSON.stringify(list));

  return json(
    { ok: true, city: city || region || "Unknown", region: region || "", countryCode },
    200,
    corsHeaders
  );
}

/**
 * Secondary geo lookup for better city accuracy (esp. China).
 * ip-api free tier: HTTP only, ~45 req/min — enough for personal site.
 */
async function refineGeo(ip) {
  if (!ip || ip.startsWith("127.") || ip === "::1") return null;

  // 1) ip-api.com (good China city coverage)
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,lat,lon`,
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        return {
          city: (data.city || "").toString().trim().slice(0, 64),
          region: (data.regionName || "").toString().trim().slice(0, 64),
          country: (data.country || "").toString().trim().slice(0, 64),
          countryCode: (data.countryCode || "").toString().trim().slice(0, 8).toUpperCase(),
          lat: Number(data.lat),
          lng: Number(data.lon),
        };
      }
    }
  } catch (e) {
    console.error("ip-api refine failed", e);
  }

  // 2) fallback: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        return {
          city: (data.city || "").toString().trim().slice(0, 64),
          region: (data.region || "").toString().trim().slice(0, 64),
          country: (data.country_name || "").toString().trim().slice(0, 64),
          countryCode: (data.country_code || "").toString().trim().slice(0, 8).toUpperCase(),
          lat: Number(data.latitude),
          lng: Number(data.longitude),
        };
      }
    }
  } catch (e) {
    console.error("ipapi.co refine failed", e);
  }

  return null;
}

async function handleCities(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  const cities = list.map((item) => ({
    city: item.city,
    region: item.region || "",
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
