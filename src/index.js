/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * POST /hit    - Record a visitor
 * GET  /cities - List recent cities
 *
 * Geo strategy:
 *   Global: Cloudflare request.cf
 *   China:  pconline (国内库) -> ip-api -> cf, plus local city lat/lng table
 *
 * Binding: KV VISITORS
 */

const MAX_CITIES = 120;

/** Major CN cities: English name -> [lat, lng] (also used after normalizing Chinese names) */
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

/** Chinese city / alias -> English key in CN_CITY_COORDS */
const CN_NAME_MAP = {
  北京: "Beijing",
  上海: "Shanghai",
  广州: "Guangzhou",
  深圳: "Shenzhen",
  杭州: "Hangzhou",
  宁波: "Ningbo",
  南京: "Nanjing",
  苏州: "Suzhou",
  无锡: "Wuxi",
  西安: "Xi'an",
  成都: "Chengdu",
  重庆: "Chongqing",
  武汉: "Wuhan",
  长沙: "Changsha",
  郑州: "Zhengzhou",
  天津: "Tianjin",
  青岛: "Qingdao",
  大连: "Dalian",
  厦门: "Xiamen",
  福州: "Fuzhou",
  合肥: "Hefei",
  济南: "Jinan",
  沈阳: "Shenyang",
  哈尔滨: "Harbin",
  长春: "Changchun",
  昆明: "Kunming",
  南宁: "Nanning",
  贵阳: "Guiyang",
  南昌: "Nanchang",
  太原: "Taiyuan",
  石家庄: "Shijiazhuang",
  兰州: "Lanzhou",
  银川: "Yinchuan",
  西宁: "Xining",
  呼和浩特: "Hohhot",
  乌鲁木齐: "Urumqi",
  拉萨: "Lhasa",
  海口: "Haikou",
  三亚: "Sanya",
  东莞: "Dongguan",
  佛山: "Foshan",
  珠海: "Zhuhai",
  中山: "Zhongshan",
  惠州: "Huizhou",
  温州: "Wenzhou",
  嘉兴: "Jiaxing",
  绍兴: "Shaoxing",
  台州: "Taizhou",
  金华: "Jinhua",
  徐州: "Xuzhou",
  常州: "Changzhou",
  南通: "Nantong",
  扬州: "Yangzhou",
  盐城: "Yancheng",
  保定: "Baoding",
  唐山: "Tangshan",
  洛阳: "Luoyang",
  芜湖: "Wuhu",
  泉州: "Quanzhou",
  潍坊: "Weifang",
  淄博: "Zibo",
  临沂: "Linyi",
  邯郸: "Handan",
  桂林: "Guilin",
  香港: "Hong Kong",
  澳门: "Macau",
  台北: "Taipei",
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
  } catch {
    // no body
  }

  // Always try to refine for CN — CF/ip-api often map 地级市 -> 省会
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

  // Normalize CN names + attach accurate coordinates from local table
  const normalized = normalizeCnCity(city);
  if (normalized) {
    city = normalized;
    const coords = CN_CITY_COORDS[normalized];
    if (coords) {
      lat = coords[0];
      lng = coords[1];
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

function normalizeCnCity(name) {
  if (!name) return "";
  let s = String(name).trim();
  // strip 市/地区/自治州 suffix
  s = s.replace(/(特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区|省|市|地区|州)$/u, "");
  if (CN_NAME_MAP[s]) return CN_NAME_MAP[s];
  // already English?
  if (CN_CITY_COORDS[s]) return s;
  // try title case match
  const title = s.charAt(0).toUpperCase() + s.slice(1);
  if (CN_CITY_COORDS[title]) return title;
  if (s === "Xi'an" || s === "Xi’an") return "Xi'an";
  return s; // keep as-is (may be English from ip-api)
}

async function refineGeo(ip, hintCountry) {
  if (!ip || ip.startsWith("127.") || ip === "::1") return null;

  // 1) 太平洋电脑网 — 国内库，对中国城市更准
  try {
    const res = await fetch(
      `https://whois.pconline.com.cn/ipJson.jsp?ip=${encodeURIComponent(ip)}&json=true`,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json,text/plain,*/*" } }
    );
    if (res.ok) {
      const text = await res.text();
      // sometimes returned as GBK-ish / with padding — try JSON parse
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const m = text.match(/\{.*\}/s);
        if (m) data = JSON.parse(m[0]);
      }
      if (data && (data.city || data.pro || data.addr)) {
        let city = (data.city || "").toString().trim();
        let region = (data.pro || "").toString().trim();
        // city field sometimes is empty and addr has "陕西省西安市"
        if (!city && data.addr) {
          const addr = String(data.addr);
          const cm = addr.match(/([\u4e00-\u9fa5]{2,10}?)(?:市|地区|州)/);
          if (cm) city = cm[1];
        }
        if (city || region) {
          return {
            city: city || region,
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

  // 2) ip-api.com
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`,
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
