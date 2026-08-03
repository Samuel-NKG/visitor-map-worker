/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * GET  /  or /dashboard - Visitor detail dashboard (HTML)
 * POST /hit     - Record a visitor
 * GET  /cities  - List recent cities (auto-migrates bad historical names)
 * GET|POST /cleanup - Force rewrite historical logs
 *
 * Binding: KV VISITORS
 */

const MAX_CITIES = 120;

const DASHBOARD_HTML = "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Visitor Dashboard</title>\n<style>body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0e;color:#eee;padding:2rem;line-height:1.5}\na{color:#ff6b2c}code{background:#1a1a20;padding:.15rem .4rem;border-radius:4px}</style></head><body>\n<h1>Visitor Map Dashboard</h1>\n<p>正在打开访客明细页…</p>\n<p>若未自动跳转，请打开：<br/>\n<a id=\"a\" href=\"#\">dashboard</a></p>\n<script>\nvar api = location.origin + '/cities';\nvar url = 'https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/dashboard.html?api=' + encodeURIComponent(api);\ndocument.getElementById('a').href = url;\nlocation.replace(url);\n</script>\n</body></html>";

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
  Xiamen: [24.8741, 118.6757],
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
