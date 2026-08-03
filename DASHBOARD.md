# 访客明细页（Dashboard）

展示每次访问的 **北京时间 / 格林威治时间**、**城市 / 地区 / 国家**（IP 地理来源）与坐标。

**不展示原始 IP 地址**（隐私），只展示解析后的位置。

---

## 立刻可用（无需改 Worker）

打开：

```text
https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/dashboard.html?api=https://你的Worker地址/cities
```

你的线上示例：

```text
https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/dashboard.html?api=https://map.samuelnkg.com/cities
```

本地打开仓库里的 [`frontend/dashboard.html`](./frontend/dashboard.html) 时，同样在 URL 后加 `?api=...`。

---

## 页面能力

| 项目 | 说明 |
|------|------|
| 总记录 / 城市数 / 国家数 | 顶部统计 |
| 北京时间、格林威治时间 | 每条访问时刻 |
| 城市、地区、国家 | IP 解析来源 |
| 坐标 | 城市级近似 |
| 搜索 | 按城市/地区/国家过滤 |
| 刷新 | 手动或每 60 秒自动 |

---

## 可选：挂在 Worker 根路径

在 `src/index.js` 的 `fetch` 路由里增加：

```js
if ((url.pathname === "/" || url.pathname === "/dashboard") && request.method === "GET") {
  const api = url.origin + "/cities";
  const target =
    "https://cdn.jsdelivr.net/gh/Samuel-NKG/visitor-map-worker@main/frontend/dashboard.html?api=" +
    encodeURIComponent(api);
  return Response.redirect(target, 302);
}
```

部署后即可访问：

- `https://map.samuelnkg.com/`
- `https://map.samuelnkg.com/dashboard`

---

## 注意

若 GitHub 上的 `src/index.js` 曾被误覆盖，请从提交 `8fe8c109` 恢复完整 Worker 后再 Deploy，**不要**用残缺版本覆盖线上 Worker。
