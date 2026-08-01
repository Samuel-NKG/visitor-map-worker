# Visitor Map Worker

Cloudflare Worker + KV，用来记录你的网站访客来自哪些城市（只到城市级别，不存精确坐标）。

给 [samuelnkg.com](https://www.samuelnkg.com) 的「Visitor Origins」使用。

## 功能

- `POST /hit`：前端上报一个城市
- `GET /cities`：获取最近的访客城市列表（最多 80 条）
- 同一城市 30 分钟内重复访问会被去重

## 你需要做的步骤（大约 5 分钟）

### 1. 注册 / 登录 Cloudflare

去 [https://dash.cloudflare.com](https://dash.cloudflare.com) 注册一个免费账号。

### 2. 创建 KV 命名空间

1. 左侧菜单 → **Workers & Pages** → **KV**
2. 点 **Create a namespace**
3. 名字随便写，比如 `visitor-cities`
4. 创建后复制它的 **Namespace ID**

### 3. 创建 Worker

**方式 A：网页直接创建（最简单，推荐）**

1. 左侧菜单 → **Workers & Pages** → **Create** → **Create Worker**
2. 名字写成 `visitor-map-worker`
3. 点 **Deploy**
4. 进入这个 Worker → **Settings** → **Variables**
   - 找到 **KV Namespace Bindings**，点添加：
     - Variable name 填：`VISITORS`
     - KV namespace 选你刚才创建的那个
5. 点右上角 **Edit code**，把本仓库 `src/index.js` 里的**全部代码**复制粘贴进去，然后 **Save and deploy**

**方式 B：用 Wrangler 命令行（可选）**

```bash
npm install -g wrangler
wrangler login
# 把 wrangler.toml 里的 YOUR_KV_NAMESPACE_ID 换成真实 ID
wrangler deploy
```

### 4. 拿到 Worker 地址

部署成功后，你会得到类似这样的地址：

```
https://visitor-map-worker.你的子域名.workers.dev
```

记下这个地址，发给我。

### 5. （可选但推荐）限制来源

在 Worker 的 **Settings → Variables** 里添加环境变量：

```
ALLOWED_ORIGIN = https://www.samuelnkg.com
```

这样只有你的网站可以调用接口。

## 接口说明

### 上报城市

```http
POST /hit
Content-Type: application/json

{
  "city": "Taipei",
  "country": "Taiwan",
  "countryCode": "TW"
}
```

### 获取城市列表

```http
GET /cities
```

返回示例：

```json
{
  "cities": [
    { "city": "Taipei", "country": "Taiwan", "countryCode": "TW", "ts": 1722512345678 },
    { "city": "Shanghai", "country": "China", "countryCode": "CN", "ts": 1722512000000 }
  ]
}
```

## 下一步

把你的 Worker 地址（`https://xxx.workers.dev`）发给我，我会帮你在个人主页前端接上：

1. 访问时自动获取城市并上报
2. 在「Visitor Origins」位置显示最近访客城市
