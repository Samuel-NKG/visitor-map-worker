# Visitor Map Worker

基于 **Cloudflare Workers + KV** 的城市级访客来源统计，配套 **即插即用** 的前端地图模块。

- 后端：记录城市级访问（非精确 GPS）
- 前端：一行配置即可渲染 Leaflet 地图
- 适合 GitHub Pages / Hexo / Hugo / 任意静态站

> 在线示例：[samuelnkg.com](https://www.samuelnkg.com) · API：`https://map.samuelnkg.com/cities`

---

## 模块组成

| 部分 | 路径 | 说明 |
|------|------|------|
| Worker 后端 | [`src/index.js`](./src/index.js) | `/hit` `/cities` `/cleanup` |
| **前端模块（推荐）** | [`frontend/visitor-map.js`](./frontend/visitor-map.js) | 自动加载 Leaflet + 上报 + 画点 |
| 演示页 | [`examples/plug-and-play.html`](./examples/plug-and-play.html) | 复制即用 |

---

## 最快上手：前端即插即用

### 方式 A：JS 调用（推荐）

```html
<!-- 1. 放一个容器 -->
<div id="visitor-map" style="height: 360px;"></div>

<!-- 2. 引入模块（可用 jsDelivr 或自建路径） -->
<script src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"></script>

<!-- 3. 挂载 -->
<script>
  VisitorMap.mount({
    workerUrl: "https://YOUR_WORKER.workers.dev", // 换成你的 Worker
    container: "#visitor-map",
    // markerColor: "#ff6b2c",
    // report: true,   // 是否 POST /hit，默认 true
  });
</script>
```

### 方式 B：零逻辑 data 属性

```html
<div
  data-visitor-map
  data-worker-url="https://YOUR_WORKER.workers.dev"
  style="height: 360px"
></div>
<script
  src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"
  defer
></script>
```

模块会自动：

1. 注入 Leaflet CSS/JS（若页面还没有）
2. `POST /hit` 记录本次访问
3. `GET /cities` 拉取列表
4. **先按坐标、再按名字**聚合，圆点大小表示次数
5. 乱码城市名按坐标吸附到已知城市

### `VisitorMap.mount` 选项

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `workerUrl` | string | 必填 | Worker 根地址，不要末尾 `/` |
| `container` | string \| Element | 必填 | 选择器或 DOM 节点 |
| `report` | boolean | `true` | 是否上报 `/hit` |
| `loadLeaflet` | boolean | `true` | 是否自动加载 Leaflet |
| `markerColor` | string | `#ff6b2c` | 圆点颜色 |
| `height` | number \| string | `360px` | 容器高度 |
| `tileUrl` | string | CARTO dark | 自定义底图 |
| `onLoad` | function | — | `(cities) => {}` |
| `onError` | function | — | `(err) => {}` |

返回值：`Promise<{ map, layer, reload, destroy }>`

---

## 后端部署（只需一次）

### 仪表盘方式（约 10 分钟）

1. 注册 [Cloudflare](https://dash.cloudflare.com)（免费即可）
2. **Workers & Pages → KV → Create**，例如 `visitor-cities`
3. **Create Worker**，名称随意 → Deploy
4. **Edit code**，粘贴 [`src/index.js`](./src/index.js) 全文 → Save and Deploy
5. **Settings → Bindings → KV**：
   - Variable name：**`VISITORS`**（必须一致）
   - 选择刚建的 KV
6. 复制 Worker 地址，例如：
   `https://visitor-map-worker.<subdomain>.workers.dev`

### 命令行

```bash
git clone https://github.com/Samuel-NKG/visitor-map-worker.git
cd visitor-map-worker
npm install
npx wrangler login
npx wrangler kv namespace create visitor-cities
# 把 id 填进 wrangler.toml
npx wrangler deploy
```

### 自测

```bash
curl -X POST "https://你的地址/hit" -H "Content-Type: application/json" -d '{}'
curl "https://你的地址/cities"
```

---

## API 一览

| 方法 | 路径 | 作用 |
|------|------|------|
| `POST` | `/hit` | 记录一次访问 |
| `GET` | `/cities` | 最近访客列表（并自动修正坏标签） |
| `GET/POST` | `/cleanup` | 强制清洗历史 log |

可选环境变量 `ALLOWED_ORIGIN`：限制 CORS 为你的站点。

---

## 项目结构

```text
visitor-map-worker/
├── src/index.js                 # Worker
├── frontend/visitor-map.js      # 即插即用前端模块
├── examples/
│   ├── plug-and-play.html       # 推荐演示
│   ├── minimal.html
│   └── frontend-snippet.js
├── wrangler.toml
├── package.json
├── LICENSE                      # MIT
└── README.md
```

---

## 隐私与精度

- 只存城市 / 地区 / 国家与 IP 推导的大致坐标，无 Cookie、无用户 ID
- IP 定位在中国大陆常有误差（如地市被标成省会），模块会尽量纠正乱码与近距离重名
- 面向个人站点；非企业级分析产品

---

## License

[MIT](./LICENSE)
