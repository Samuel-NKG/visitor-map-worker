# 使用说明（中文）

本项目 = **访客城市统计后端** + **自带地图前端模块**。  
使用方**不必自己再找地图、写 Leaflet 代码**，引入 `frontend/visitor-map.js` 即可渲染。

---

## 1. 部署后端

### 1.1 注册 Cloudflare

打开 [https://dash.cloudflare.com](https://dash.cloudflare.com)，免费账号即可。

### 1.2 创建 KV

1. **Workers & Pages** → **KV**  
2. **Create a namespace**，例如 `visitor-cities`

### 1.3 创建 Worker 并粘贴代码

1. **Create Worker** → 部署一个空 Worker  
2. **Edit code**，删除默认内容  
3. 复制本仓库 [`src/index.js`](./src/index.js) 全文粘贴  
4. **Save and Deploy**

### 1.4 绑定 KV（关键）

1. Worker → **Settings** → **Bindings** → 添加 **KV Namespace**  
2. **Variable name** 必须填：`VISITORS`  
3. 选择刚才的 KV 命名空间并保存

### 1.5 拿到地址

形如：

```text
https://visitor-map-worker.你的子域.workers.dev
```

可选：在 Triggers / Custom Domains 绑定 `map.你的域名.com`。

### 1.6 测试后端

```bash
curl -X POST "https://你的地址/hit" -H "Content-Type: application/json" -d '{}'
curl "https://你的地址/cities"
```

有 JSON 返回即成功。

---

## 2. 渲染地图（项目自带，不用自己找地图）

### 2.1 推荐：调用模块

在你的 HTML 里：

```html
<div id="visitor-map" style="height: 360px; width: 100%;"></div>

<script src="https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/visitor-map.js"></script>
<script>
  VisitorMap.mount({
    workerUrl: "https://你的Worker地址",
    container: "#visitor-map",
  });
</script>
```

模块会自动：

1. 加载 Leaflet（地图库）与深色底图  
2. `POST /hit` 记录当前访客  
3. `GET /cities` 拉历史  
4. 按坐标聚合，用圆点画在地图上（大小表示次数）

### 2.2 更简单：data 属性

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

### 2.3 不用 CDN，改成本地文件

1. 下载 [`frontend/visitor-map.js`](./frontend/visitor-map.js) 到你的站点  
2. 改成：

```html
<script src="/js/visitor-map.js"></script>
```

### 2.4 本地看效果

打开仓库中的：

[`examples/plug-and-play.html`](./examples/plug-and-play.html)

把里面的 `WORKER_URL` 改成你的地址，用浏览器打开即可看到地图。

---

## 3. 可选配置

```js
VisitorMap.mount({
  workerUrl: "https://xxx.workers.dev",
  container: "#visitor-map",
  report: true,           // false 则只展示、不写新访问
  markerColor: "#ff6b2c",
  height: 400,
  onLoad: function (cities) {
    console.log("共", cities.length, "条");
  },
  onError: function (err) {
    console.error(err);
  },
});
```

若页面**已经**自己引入了 Leaflet，可设 `loadLeaflet: false`。

CORS：在 Worker 环境变量中设置 `ALLOWED_ORIGIN=https://你的网站`（可选）。

历史乱码清洗：浏览器访问 `https://你的地址/cleanup`。

---

## 4. 和「只给 API、自己找地图」的区别

| 做法 | 你需要做的 |
|------|------------|
| 只有 API | 自己选地图、写请求、写画点、写聚合 |
| **本项目** | 部署 Worker + 一段 `VisitorMap.mount`（或 data 属性） |

地图渲染逻辑在 [`frontend/visitor-map.js`](./frontend/visitor-map.js)，与后端同仓库维护，即插即用。

---

## 5. 注意

- 定位为**城市级**，IP 库在国内常有误差  
- 免费 Cloudflare 额度一般够个人站使用  
- 不存精确到人的身份信息  
