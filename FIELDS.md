# 访客记录字段说明

升级后的 Worker 会在每次 `POST /hit` 写入尽可能多的请求元数据，并在 `/`、`/dashboard` 与 `GET /cities` 中返回。

## 字段列表

| 字段 | 来源 | 说明 |
|------|------|------|
| `city` / `region` / `country` / `countryCode` | IP 地理 + 修正 | 城市级位置 |
| `lat` / `lng` | CF / 城市表 | 近似坐标 |
| `ts` | 服务器时间 | Unix 毫秒 |
| `timeGMT` / `timeBeijing` | 由 `ts` 计算 | 格林威治 / 北京时间 |
| `ip` | `CF-Connecting-IP` | 访客 IP |
| `asn` | `request.cf.asn` | 自治系统号 |
| `asOrg` | `request.cf.asOrganization` | 运营商 / 组织 |
| `colo` | `request.cf.colo` | Cloudflare 接入机房代码 |
| `timezone` | `request.cf.timezone` | 时区 |
| `continent` | `request.cf.continent` | 大洲代码 |
| `httpProtocol` | `request.cf.httpProtocol` | 如 HTTP/2 |
| `tlsVersion` | `request.cf.tlsVersion` | TLS 版本 |
| `postalCode` | `request.cf.postalCode` | 邮编（若有） |
| `userAgent` | `User-Agent` 头 | 浏览器 / 设备 |
| `referer` | `Referer` 头 | 来源页 |

## 注意

1. **历史记录**在升级前没有 IP/UA 等字段，表格里会显示为 `—`。  
2. **新访问** Deploy 后才会带上全字段。  
3. 明细页会展示上述全部列；地图前端仍只用城市坐标，不展示 IP。  
4. 存储 IP 与 UA 涉及隐私，仅建议用于个人站点后台。

## 部署

将完整的 `src/index.js`（含全字段采集与 Dashboard）粘贴到 Cloudflare Worker → Save and Deploy。  
然后打开：`https://你的Worker域名/`
