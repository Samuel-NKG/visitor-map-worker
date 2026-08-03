# 如何把 Cloudflare 上的完整 Worker 同步回本仓库

因 GitHub API 对单文件体积有限制，大文件（含完整 Dashboard HTML）有时无法通过自动化一次性写入。

**以你 Cloudflare 里已 Deploy、可正常工作的代码为准。**

## 同步步骤（推荐）

1. 打开 Cloudflare Worker 编辑器，全选复制全部代码  
2. 打开本仓库 [`src/index.js`](./src/index.js) → Edit  
3. 全部替换为 Cloudflare 中的代码 → Commit  
4. （可选）把同款明细页保存为 [`frontend/dashboard.html`](./frontend/dashboard.html)

## 当前应包含的能力

- `POST /hit`：城市地理 + **IP / ASN / 运营商 / 机房 / 时区 / UA / Referer** 等  
- `GET /cities`：返回上述全部字段  
- `GET /` 与 `GET /dashboard`：全字段明细表格  
- `timeGMT` / `timeBeijing`

字段说明见 [FIELDS.md](./FIELDS.md)。

## 朋友部署

每人使用自己的 Cloudflare 账号与 Worker 地址，数据互不影响。
