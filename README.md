# Visitor Map Worker

**城市级访客来源统计 + 自带可交互地图渲染。**

基于 Cloudflare Workers + KV。别人克隆/引用本项目后，**不需要自己再找地图库、写聚合逻辑**——前端模块会自动加载 Leaflet、上报访问并画出圆点地图。

> 在线示例：[samuelnkg.com](https://www.samuelnkg.com) · API：`https://map.samuelnkg.com/cities`

---

## 你得到什么

| 能力 | 是否自带 | 说明 |
|------|----------|------|
| 访客城市记录 API | ✅ | `POST /hit`、`GET /cities` |
| **地图渲染** | ✅ | [`frontend/visitor-map.js`](./frontend/visitor-map.js) |
| Leaflet 加载 | ✅ | 模块自动注入 CDN，无需手写 |
| 圆点大小 ∝ 访问次数 | ✅ | 内置 |
| 坐标优先聚合 / 乱码修正 | ✅ | 内置 |

**不需要**再去：

- 自己选地图 SDK
- 自己写 `L.map` / `circleMarker`
- 自己处理中国重名城市、乱码标签

---

## 5 分钟出图（推荐路径）

### ① 部署后端（一次）

1. [Cloudflare](https://dash.cloudflare.com) 免费账号  
2. 创建 KV 命名空间（如 `visitor-cities`）  
3. 创建 Worker，粘贴 [`src/index.js`](./src/index.js) → Deploy  
4. Bindings 里绑定 KV，变量名必须是 **`VISITORS`**  
5. 复制 Worker 地址，例如 `https://xxx.workers.dev`

### ② 任意网页插入地图（复制即用）

```html
<!-- 地图容器 -->
<div id="visitor-map" style="height: 360px; width: 100%;"></div>

<!-- 本项目自带的前端模块：自动加载地图并渲染 -->
<script src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"></script>
<script>
  VisitorMap.mount({
    workerUrl: "https://你的Worker地址",  // 不要末尾斜杠
    container: "#visitor-map",
  });
</script>
```

完成。打开页面即会：

1. 自动加载 Leaflet 底图  
2. 向 Worker 上报本次访问  
3. 拉取城市列表并渲染圆点  

### ③ 更懒：只用 HTML 属性

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

---

## 本地完整演示

```bash
git clone https://github.com/Samuel-NKG/visitor-map-worker.git
cd visitor-map-worker
# 编辑 examples/plug-and-play.html 里的 WORKER_URL
# 用浏览器打开该文件，或任意静态服务器托管
```

- [`examples/plug-and-play.html`](./examples/plug-and-play.html) — **官方推荐**，展示模块出图  
- [`examples/minimal.html`](./examples/minimal.html) — 内联版参考  

中文步骤长文见：[USAGE.zh-CN.md](./USAGE.zh-CN.md)

---

## 前端模块 API

```js
VisitorMap.mount({
  workerUrl: "https://xxx.workers.dev", // 必填
  container: "#visitor-map",            // 必填：选择器或 DOM
  report: true,                         // 是否 POST /hit
  loadLeaflet: true,                    // 是否自动加载 Leaflet
  markerColor: "#ff6b2c",
  height: 360,
  onLoad: (cities) => {},
  onError: (err) => {},
});
// => Promise<{ map, layer, reload, destroy }>
```

文件位置：[`frontend/visitor-map.js`](./frontend/visitor-map.js)  
也可下载到自己站点目录后改为相对路径引用，不依赖 jsDelivr。

---

## 后端 API

| 方法 | 路径 | 作用 |
|------|------|------|
| `POST` | `/hit` | 记录一次访问 |
| `GET` | `/cities` | 访客列表（读取时会尝试修正坏标签） |
| `GET/POST` | `/cleanup` | 强制清洗历史记录 |

可选变量 `ALLOWED_ORIGIN`：限制跨域来源。

### Wrangler 部署

```bash
npm install
npx wrangler login
npx wrangler kv namespace create visitor-cities
# 填 wrangler.toml 中的 id
npx wrangler deploy
```

---

## 目录结构

```text
visitor-map-worker/
├── src/index.js                 # 后端 Worker
├── frontend/visitor-map.js      # ★ 自带地图渲染模块（即插即用）
├── examples/
│   ├── plug-and-play.html       # ★ 复制即用的完整出图示例
│   ├── minimal.html
│   └── frontend-snippet.js
├── USAGE.zh-CN.md               # 中文使用说明
├── wrangler.toml
├── package.json
├── LICENSE
└── README.md
```

---

## 隐私与精度

- 仅城市 / 地区 / 国家与 IP 推导坐标；无 Cookie、无用户 ID  
- IP 定位有误差（国内地市常被标成省会）；模块会尽量处理乱码与近距离合并  
- 面向个人站点流量  

---

## License

[MIT](./LICENSE)
