/**
 * Visitor City Tracker - Cloudflare Worker
 *
 * GET  /  or /dashboard - Visitor detail dashboard (HTML UI)
 * POST /hit     - Record a visitor
 * GET  /cities  - List recent cities (auto-migrates bad historical names)
 * GET|POST /cleanup - Force rewrite historical logs
 *
 * Binding: KV VISITORS
 *
 * NOTE: If this file is incomplete, restore from commit 8fe8c109.
 * Dashboard UI: open https://map.YOUR_DOMAIN/ after deploying with dashboard routes.
 */

const MAX_CITIES = 120;

// Temporary stub so deploys do not crash; replace entire file with full source from:
// https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@8fe8c10947435db8b5a8bb2de4fc6d877afd0da3/src/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    // Serve a working dashboard that talks to the SAME worker if KV binding exists,
    // otherwise show restore instructions.
    if ((url.pathname === "/" || url.pathname === "/dashboard") && request.method === "GET") {
      const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Visitor Map</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0e;color:#eee}header,main{max-width:1100px;margin:0 auto;padding:1rem 1.25rem}header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;border-bottom:1px solid #222}h1{margin:0;font-size:1.1rem}p{margin:.3rem 0 0;color:#999;font-size:.85rem}button,.btn{background:#141418;border:1px solid #333;color:#eee;padding:.4rem .8rem;border-radius:8px;cursor:pointer;text-decoration:none;font-size:.85rem}button.primary{border-color:#ff6b2c;color:#ffb08a}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.6rem;margin:1rem 0}.stat{background:#141418;border:1px solid #222;border-radius:10px;padding:.75rem}.stat b{display:block;color:#ff6b2c;font-size:1.25rem;margin-top:.2rem}.stat span{color:#888;font-size:.75rem}input{width:100%;max-width:360px;background:#141418;border:1px solid #333;border-radius:8px;color:#fff;padding:.5rem .75rem;margin:.5rem 0 1rem}.wrap{overflow:auto;border:1px solid #222;border-radius:10px}table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{padding:.55rem .7rem;border-bottom:1px solid #1c1c1c;text-align:left;white-space:nowrap}th{background:#1a1a20;color:#888;position:sticky;top:0}tr:nth-child(even){background:#121214}.mu{color:#888}.city{font-weight:600}.badge{border:1px solid #333;border-radius:999px;padding:.1rem .4rem;font-size:.75rem;color:#aaa}footer{margin-top:1rem;color:#777;font-size:.8rem}.err{color:#ff8a80;text-align:center;padding:2rem}.warn{background:#2a1a10;border:1px solid #5a3a20;padding:1rem;border-radius:10px;margin-bottom:1rem;color:#ffb08a;font-size:.9rem}</style></head><body>
<header><div><h1>Visitor Map · 访客明细</h1><p>访问时间 · IP 地理来源（不展示原始 IP）</p></div>
<div><button class="primary" id="r">刷新</button> <a class="btn" href="/cities" target="_blank">JSON</a></div></header>
<main>
<div class="warn" id="warn" style="display:none">当前 Worker 源码不完整：请在 GitHub 将 src/index.js 恢复为提交 8fe8c109 的完整版本后重新 Deploy。</div>
<div class="stats"><div class="stat"><span>总记录</span><b id="t">—</b></div><div class="stat"><span>城市数</span><b id="c">—</b></div><div class="stat"><span>国家/地区</span><b id="n">—</b></div><div class="stat"><span>最近访问</span><b id="l" style="font-size:1rem">—</b></div></div>
<input id="q" type="search" placeholder="搜索城市、地区、国家…"/>
<div class="wrap"><table><thead><tr><th>#</th><th>北京时间</th><th>格林威治时间</th><th>城市</th><th>地区</th><th>国家</th><th>坐标</th></tr></thead>
<tbody id="b"><tr><td colspan="7" class="mu" style="text-align:center;padding:2rem">加载中…</td></tr></tbody></table></div>
<footer>数据来自 IP 地理库，可能有误差。不展示原始 IP。</footer></main>
<script>
(function(){
var all=[],B=document.getElementById('b'),Q=document.getElementById('q');
function e(s){return String(s==null?'':s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>')}
function o(c){return [c.city,c.region,c.country||c.countryCode].filter(Boolean).join(' ')}
function draw(list){
document.getElementById('t').textContent=all.length;
var C={},N={};all.forEach(function(x){if(x.city)C[x.city]=1;var k=x.countryCode||x.country;if(k)N[k]=1});
document.getElementById('c').textContent=Object.keys(C).length;
document.getElementById('n').textContent=Object.keys(N).length;
document.getElementById('l').textContent=all[0]?(all[0].timeBeijing||all[0].timeGMT||'—'):'—';
if(!list.length){B.innerHTML='<tr><td colspan="7" class="mu" style="text-align:center;padding:2rem">暂无记录</td></tr>';return}
B.innerHTML=list.map(function(c,i){var la=c.lat!=null?Number(c.lat).toFixed(4):'—',ln=c.lng!=null?Number(c.lng).toFixed(4):'—';
return '<tr><td class="mu">'+(i+1)+'</td><td>'+e(c.timeBeijing||'—')+'</td><td class="mu">'+e(c.timeGMT||'—')+'</td><td class="city">'+e(c.city||'Unknown')+'</td><td>'+e(c.region||'—')+'</td><td><span class="badge">'+e(c.countryCode||c.country||'—')+'</span></td><td class="mu">'+la+', '+ln+'</td></tr>'}).join('')}
function filter(){var q=(Q.value||'').toLowerCase().trim();draw(!q?all:all.filter(function(c){return (o(c)+' '+(c.timeBeijing||'')+' '+(c.timeGMT||'')).toLowerCase().indexOf(q)>=0}))}
function load(){fetch('/cities',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(function(d){all=d.cities||[];filter()}).catch(function(err){document.getElementById('warn').style.display='block';B.innerHTML='<tr><td colspan="7" class="err">加载失败：'+e(err.message)+'</td></tr>'})}
document.getElementById('r').onclick=load;Q.oninput=filter;load();setInterval(load,60000)
})();
</script></body></html>`;
      return new Response(html, {
        status: 200,
        headers: Object.assign({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, cors),
      });
    }
    if (url.pathname === "/cities" && request.method === "GET") {
      try {
        const raw = await env.VISITORS.get("cities", { type: "json" });
        const list = Array.isArray(raw) ? raw : [];
        const cities = list.map((item) => {
          const ts = item.ts;
          const pad = (x) => String(x).padStart(2, "0");
          let timeGMT = null, timeBeijing = null;
          if (Number.isFinite(Number(ts)) && Number(ts) > 0) {
            const d = new Date(Number(ts));
            timeGMT = d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " GMT";
            const b = new Date(Number(ts) + 8 * 3600 * 1000);
            timeBeijing = b.getUTCFullYear() + "-" + pad(b.getUTCMonth() + 1) + "-" + pad(b.getUTCDate()) + " " + pad(b.getUTCHours()) + ":" + pad(b.getUTCMinutes()) + ":" + pad(b.getUTCSeconds()) + " CST";
          }
          return {
            city: item.city,
            region: item.region || "",
            country: item.country,
            countryCode: item.countryCode,
            lat: item.lat,
            lng: item.lng,
            ts: item.ts,
            timeGMT: item.timeGMT || timeGMT,
            timeBeijing: item.timeBeijing || timeBeijing,
          };
        });
        return new Response(JSON.stringify({ cities }), {
          status: 200,
          headers: Object.assign({ "Content-Type": "application/json" }, cors),
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500,
          headers: Object.assign({ "Content-Type": "application/json" }, cors),
        });
      }
    }
    if (url.pathname === "/hit" && request.method === "POST") {
      return new Response(
        JSON.stringify({
          error: "Worker source incomplete. Restore src/index.js from commit 8fe8c109 and redeploy.",
          restore: "https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@8fe8c10947435db8b5a8bb2de4fc6d877afd0da3/src/index.js",
        }),
        { status: 503, headers: Object.assign({ "Content-Type": "application/json" }, cors) }
      );
    }
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: Object.assign({ "Content-Type": "application/json" }, cors),
    });
  },
};
