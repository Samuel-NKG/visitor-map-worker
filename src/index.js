/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * POST /hit     - Record a visitor
 * GET  /cities  - List recent cities (auto-migrates bad historical names)
 * GET|POST /cleanup - Force rewrite historical logs
 *
 * Binding: KV VISITORS
 */

const MAX_CITIES = 120;

const CN_CITY_COORDS = {
  Beijing: [39.9042, 116.4074],
  Shanghai: [31.2304, 121.4737],
  Guangzhou: [23.1291, 113.2644],
  Shenzhen: [22.5431, 114.0579],
  Hangzhou: [30.2741, 120.1551],
  Ningbo: [29.8683, 121.544],
  Nanjing: [32.0603, 118.7969],
  Suzhou: [31.2989, 120.5853],
  Wuxi: [31.4912, 120.3119],
  "Xi'an": [34.3416, 108.9398],
  Xian: [34.3416, 108.9398],
  Chengdu: [30.5728, 104.0668],
  Chongqing: [29.4316, 106.9123],
  Wuhan: [30.5928, 114.3055],
  Changsha: [28.2282, 112.9388],
  Zhengzhou: [34.7466, 113.6253],
  Tianjin: [39.3434, 117.3616],
  Qingdao: [36.0671, 120.3826],
  Dalian: [38.914, 121.6147],
  Xiamen: [24.4798, 118.0894],
  Fuzhou: [26.0745, 119.2965],
  Hefei: [31.8206, 117.2272],
  Jinan: [36.6512, 117.1201],
  Shenyang: [41.8057, 123.4315],
  Harbin: [45.8038, 126.534],
  Changchun: [43.8171, 125.3235],
  Kunming: [25.0389, 102.7183],
  Nanning: [22.817, 108.3669],
  Guiyang: [26.647, 106.6302],
  Nanchang: [28.682, 115.8579],
  Taiyuan: [37.8706, 112.5489],
  Shijiazhuang: [38.0428, 114.5149],
  Lanzhou: [36.0611, 103.8343],
  Yinchuan: [38.4872, 106.2309],
  Xining: [36.6171, 101.7782],
  Hohhot: [40.8424, 111.7492],
  Urumqi: [43.8256, 87.6168],
  Lhasa: [29.6525, 91.1721],
  Haikou: [20.044, 110.1999],
  Sanya: [18.2528, 109.5119],
  Dongguan: [23.0207, 113.7518],
  Foshan: [23.0215, 113.1214],
  Zhuhai: [22.271, 113.5767],
  Zhongshan: [22.517, 113.3927],
  Huizhou: [23.1115, 114.4152],
  Wenzhou: [27.9944, 120.6994],
  Jiaxing: [30.7461, 120.7555],
  Shaoxing: [30.0023, 120.581],
  Taizhou: [28.6568, 121.4206],
  Jinhua: [29.0787, 119.6478],
  Xuzhou: [34.2058, 117.2841],
  Changzhou: [31.8107, 119.9741],
  Nantong: [32.0162, 120.8943],
  Yangzhou: [32.3932, 119.4215],
  Yancheng: [33.3477, 120.1626],
  Baoding: [38.8739, 115.4646],
  Tangshan: [39.6309, 118.1802],
  Luoyang: [34.6197, 112.454],
  Wuhu: [31.3526, 118.4329],
  Quanzhou: [24.8741, 118.6757],
  Weifang: [36.7069, 119.1619],
  Zibo: [36.8135, 118.054],
  Linyi: [35.1041, 118.3564],
  Handan: [36.6256, 114.5391],
  Guilin: [25.2342, 110.1799],
  "Hong Kong": [22.3193, 114.1694],
  Macau: [22.1987, 113.5439],
  Taipei: [25.033, 121.5654],
};

const CN_NAME_MAP = {
  "\u5317\u4eac": "Beijing",
  "\u4e0a\u6d77": "Shanghai",
  "\u5e7f\u5dde": "Guangzhou",
  "\u6df1\u5733": "Shenzhen",
  "\u676d\u5dde": "Hangzhou",
  "\u5b81\u6ce2": "Ningbo",
  "\u5357\u4eac": "Nanjing",
  "\u82cf\u5dde": "Suzhou",
  "\u65e0\u9521": "Wuxi",
  "\u897f\u5b89": "Xi'an",
  "\u6210\u90fd": "Chengdu",
  "\u91cd\u5e86": "Chongqing",
  "\u6b66\u6c49": "Wuhan",
  "\u957f\u6c99": "Changsha",
  "\u90d1\u5dde": "Zhengzhou",
  "\u5929\u6d25": "Tianjin",
  "\u9752\u5c9b": "Qingdao",
  "\u5927\u8fde": "Dalian",
  "\u53a6\u95e8": "Xiamen",
  "\u798f\u5dde": "Fuzhou",
  "\u5408\u80a5": "Hefei",
  "\u6d4e\u5357": "Jinan",
  "\u6c88\u9633": "Shenyang",
  "\u54c8\u5c14\u6ee8": "Harbin",
  "\u957f\u6625": "Changchun",
  "\u6606\u660e": "Kunming",
  "\u5357\u5b81": "Nanning",
  "\u8d35\u9633": "Guiyang",
  "\u5357\u660c": "Nanchang",
  "\u592a\u539f": "Taiyuan",
  "\u77f3\u5bb6\u5e84": "Shijiazhuang",
  "\u5170\u5dde": "Lanzhou",
  "\u94f6\u5ddd": "Yinchuan",
  "\u897f\u5b81": "Xining",
  "\u547c\u548c\u6d69\u7279": "Hohhot",
  "\u4e4c\u9c81\u6728\u9f50": "Urumqi",
  "\u62c9\u8428": "Lhasa",
  "\u6d77\u53e3": "Haikou",
  "\u4e09\u4e9a": "Sanya",
  "\u4e1c\u839e": "Dongguan",
  "\u4f5b\u5c71": "Foshan",
  "\u73e0\u6d77": "Zhuhai",
  "\u4e2d\u5c71": "Zhongshan",
  "\u60e0\u5dde": "Huizhou",
  "\u6e29\u5dde": "Wenzhou",
  "\u5609\u5174": "Jiaxing",
  "\u7ecd\u5174": "Shaoxing",
  "\u53f0\u5dde": "Taizhou",
  "\u91d1\u534e": "Jinhua",
  "\u5f90\u5dde": "Xuzhou",
  "\u5e38\u5dde": "Changzhou",
  "\u5357\u901a": "Nantong",
  "\u626c\u5dde": "Yangzhou",
  "\u76d0\u57ce": "Yancheng",
  "\u4fdd\u5b9a": "Baoding",
  "\u5510\u5c71": "Tangshan",
  "\u6d1b\u9633": "Luoyang",
  "\u829c\u6e56": "Wuhu",
  "\u6cc9\u5dde": "Quanzhou",
  "\u6f4d\u574a": "Weifang",
  "\u6dc4\u535a": "Zibo",
  "\u4e34\u6c82": "Linyi",
  "\u90af\u90f8": "Handan",
  "\u6842\u6797": "Guilin",
  "\u9999\u6e2f": "Hong Kong",
  "\u6fb3\u95e8": "Macau",
  "\u53f0\u5317": "Taipei",
};

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
      if (url.pathname === "/cleanup" && (request.method === "POST" || request.method === "GET")) {
        return await handleCleanup(env, corsHeaders);
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

  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      if (body.city) city = String(body.city).trim().slice(0, 64);
      if (body.country) country = String(body.country).trim().slice(0, 64);
      if (body.countryCode) countryCode = String(body.countryCode).trim().slice(0, 8).toUpperCase();
      if (Number.isFinite(Number(body.lat))) lat = Number(body.lat);
      if (Number.isFinite(Number(body.lng))) lng = Number(body.lng);
    }
  } catch {}

  if (clientIp && (countryCode === "CN" || countryCode === "HK" || countryCode === "MO" || countryCode === "TW" || !city)) {
    const refined = await refineGeo(clientIp, countryCode);
    if (refined) {
      if (refined.city) city = refined.city;
      if (refined.region) region = refined.region;
      if (refined.countryCode) countryCode = refined.countryCode;
      if (refined.country) country = refined.country;
      if (Number.isFinite(refined.lat)) lat = refined.lat;
      if (Number.isFinite(refined.lng)) lng = refined.lng;
    }
  }

  const normalized = normalizeCnCity(city);
  if (normalized) {
    city = normalized;
    const coords = CN_CITY_COORDS[normalized];
    if (coords) {
      lat = coords[0];
      lng = coords[1];
    }
  }

  if (looksLikeMojibake(city) || isProvinceOnlyName(city)) city = "";
  if (!city && region && !looksLikeMojibake(region) && !isProvinceOnlyName(region)) city = region;

  // Snap bad/missing names from coords before store
  if ((!city || looksLikeMojibake(city)) && Number.isFinite(lat) && Number.isFinite(lng)) {
    const snapped = snapCityFromCoords(lat, lng);
    if (snapped) city = snapped;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    lat = null;
    lng = null;
  }

  if (!city && !countryCode && lat === null) {
    return json({ error: "Unable to resolve location" }, 400, corsHeaders);
  }

  const displayCity =
    city || (!looksLikeMojibake(region) && !isProvinceOnlyName(region) ? region : "") || "Unknown";
  const key = (countryCode || country) + "|" + displayCity;
  const now = Date.now();

  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  list.unshift({
    key,
    city: displayCity,
    region: region || "",
    country: country || "",
    countryCode: countryCode || "",
    lat,
    lng,
    ts: now,
  });

  if (list.length > MAX_CITIES) list = list.slice(0, MAX_CITIES);
  await env.VISITORS.put("cities", JSON.stringify(list));

  return json({ ok: true, city: displayCity, region: region || "", countryCode }, 200, corsHeaders);
}

function normalizeCnCity(name) {
  if (!name) return "";
  let s = String(name).trim();
  s = s.replace(/(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|地区|州)$/u, "");
  if (CN_NAME_MAP[s]) return CN_NAME_MAP[s];
  if (CN_CITY_COORDS[s]) return s;
  const title = s.charAt(0).toUpperCase() + s.slice(1);
  if (CN_CITY_COORDS[title]) return title;
  if (s === "Xi'an" || s === "Xi\u2019an") return "Xi'an";
  return s;
}

function looksLikeMojibake(s) {
  if (!s) return true;
  const t = String(s);
  if (/\uFFFD/.test(t)) return true;
  const cjk = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  if (cjk === 0 && latin === 0) return true;
  if (/[^\x00-\x7F\u4e00-\u9fff\s\-']/g.test(t) && cjk < 2 && latin < 2) return true;
  return false;
}

function isProvinceOnlyName(s) {
  const t = String(s || "").trim();
  return /(?:\u7701|\u81ea\u6cbb\u533a)$/.test(t) || /(?:Province)$/i.test(t);
}

async function refineGeo(ip, hintCountry) {
  if (!ip || ip.startsWith("127.") || ip === "::1") return null;

  try {
    const res = await fetch(
      "https://whois.pconline.com.cn/ipJson.jsp?ip=" + encodeURIComponent(ip) + "&json=true",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" } }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      let text = "";
      try {
        text = new TextDecoder("gb18030").decode(buf);
      } catch {
        try {
          text = new TextDecoder("gbk").decode(buf);
        } catch {
          text = new TextDecoder("utf-8").decode(buf);
        }
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            data = JSON.parse(m[0]);
          } catch {}
        }
      }
      if (data && (data.city || data.pro || data.addr)) {
        let city = (data.city || "").toString().trim();
        let region = (data.pro || "").toString().trim();
        if ((!city || isProvinceOnlyName(city) || looksLikeMojibake(city)) && data.addr) {
          const addr = String(data.addr);
          const cm = addr.match(/([\u4e00-\u9fa5]{2,12}?)(?:\u5e02|\u5730\u533a|\u5dde)/);
          if (cm) city = cm[1];
        }
        if (looksLikeMojibake(city)) city = "";
        if (looksLikeMojibake(region)) region = "";
        if (isProvinceOnlyName(city)) {
          if (!region) region = city;
          city = "";
        }
        if (city || region) {
          return {
            city: city || "",
            region,
            country: "China",
            countryCode: "CN",
            lat: NaN,
            lng: NaN,
          };
        }
      }
    }
  } catch (e) {
    console.error("pconline refine failed", e);
  }

  try {
    const res = await fetch(
      "http://ip-api.com/json/" +
        encodeURIComponent(ip) +
        "?fields=status,country,countryCode,regionName,city,lat,lon",
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

  return null;
}

function isBadStoredName(s) {
  if (!s) return true;
  const t = String(s).trim();
  if (!t || t === "Unknown") return true;
  if (looksLikeMojibake(t) || isProvinceOnlyName(t)) return true;
  const ok = (t.match(/[A-Za-z\u4e00-\u9fff]/g) || []).join("");
  if (ok.length < 2) return true;
  if (ok.length / t.length < 0.5) return true;
  return false;
}

function snapCityFromCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  let bestD = 0.45;
  for (const [name, coords] of Object.entries(CN_CITY_COORDS)) {
    if (name === "Xian") continue;
    const d = Math.abs(coords[0] - lat) + Math.abs(coords[1] - lng);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

function fixStoredItem(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  let city = (item.city || "").toString().trim();
  let region = (item.region || "").toString().trim();

  const normalized = normalizeCnCity(city);
  if (normalized && CN_CITY_COORDS[normalized]) {
    city = normalized;
  }

  if (isBadStoredName(city)) {
    const snapped = snapCityFromCoords(lat, lng);
    if (snapped) city = snapped;
    else if (!isBadStoredName(region)) city = region;
    else city = "Unknown";
  }

  if (CN_CITY_COORDS[city]) {
    return Object.assign({}, item, {
      city: city,
      region: region || "",
      lat: CN_CITY_COORDS[city][0],
      lng: CN_CITY_COORDS[city][1],
      key: (item.countryCode || item.country || "") + "|" + city,
    });
  }

  return Object.assign({}, item, {
    city: city,
    region: region || "",
    key: (item.countryCode || item.country || "") + "|" + city,
  });
}

async function handleCleanup(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  const fixed = list.map(fixStoredItem);
  await env.VISITORS.put("cities", JSON.stringify(fixed));

  const sample = fixed.slice(0, 20).map(function (x) {
    return { city: x.city, lat: x.lat, lng: x.lng };
  });

  return json({ ok: true, total: fixed.length, sample: sample }, 200, corsHeaders);
}

async function handleCities(env, corsHeaders) {
  let list = [];
  try {
    const raw = await env.VISITORS.get("cities", { type: "json" });
    if (Array.isArray(raw)) list = raw;
  } catch {}

  let changed = false;
  const fixed = list.map(function (item) {
    const f = fixStoredItem(item);
    if (f.city !== item.city || f.lat !== item.lat || f.lng !== item.lng) changed = true;
    return f;
  });

  if (changed) {
    try {
      await env.VISITORS.put("cities", JSON.stringify(fixed));
    } catch (e) {
      console.error("migrate put failed", e);
    }
  }

  const cities = fixed.map(function (item) {
    return {
      city: item.city,
      region: item.region || "",
      country: item.country,
      countryCode: item.countryCode,
      lat: item.lat,
      lng: item.lng,
      ts: item.ts,
    };
  });

  return json({ cities: cities }, 200, corsHeaders);
}

function json(data, status, extraHeaders) {
  status = status || 200;
  extraHeaders = extraHeaders || {};
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, extraHeaders),
  });
}
