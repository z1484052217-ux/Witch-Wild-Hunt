# Cloudflare Workers 部署

本项目包含服务器接口、邮箱验证码、D1 数据库和 R2 图片存储，使用 **Workers** 部署。仓库默认构建已切换到独立 Cloudflare 配置，不依赖 ChatGPT 登录。

## 首次部署

安装 Node.js 22.13 或更新版本。仓库的 `wrangler.jsonc` 已绑定本网站的 D1 数据库；在同一 Cloudflare 账户重新部署时跳过资源创建。以下创建步骤仅用于新的账户：

```sh
npm ci
npm run cf -- login
npm run cf -- d1 create witch-wild-hunt
npm run cf -- r2 bucket create witch-wild-hunt-images
```

将 D1 创建命令返回的真实 ID 填入 `wrangler.jsonc` 中已有的 `DB.database_id`，不要重复添加 `DB` 绑定，然后执行 `npm run db:migrate:remote`。若同名资源已经存在，使用该资源的 ID 和名称，不要重复创建。R2 若提示尚未开通，需要账户所有者在 Cloudflare 控制台完成开通；不要自动升级套餐。

首次启用前设置 Worker 的加密密钥，按提示输入，勿写入命令或 Git：

```sh
npm run cf -- secret put RESEND_API_KEY --config wrangler.jsonc
npm run cf -- secret put ADMIN_OTP_SECRET --config wrangler.jsonc
```

`ADMIN_OTP_SECRET` 使用密码管理器生成至少 32 字符的随机字符串。`ADMIN_OTP_EMAIL`、`EMAIL_FROM` 已在配置中设置；发信方式见 [邮箱配置](EMAIL_LOGIN_SETUP.md)。缺少邮件配置时后台拒绝登录，不会回退到请求标头认证。

然后构建并发布：

```sh
npm run build
npm run deploy
```

发布命令会先应用数据库迁移，再上传 `dist/server/wrangler.json` 指定的 Worker 和客户端资源。首次成功后，将包含真实 D1 ID 的 `wrangler.jsonc` 提交回仓库。

## 从现有站点迁移内容

源码内的 488 条原始卡牌不是线上数据库备份。迁移时必须另外复制：

- D1 的 `card_edits`、`site_content` 和 `catalog_updates`，包括 `revision`、`write_epoch` 与发布时间。
- R2 中这些内容引用的所有图片，保留文件 key 与 Content-Type。

先应用 `drizzle/` 中的结构迁移，再导入完整内容和编号迁移标记，完成后才将新站点交给用户使用。不要复制验证码、登录会话或限流表。草稿及其图片仍属私有内容，备份只保存在本地受保护目录，不提交到公开 GitHub 仓库。

重新发布代码不会清空 D1 或 R2。旧站点与新站点有独立存储，发布后的编辑不会自动跨站同步。

## GitHub 自动部署

首次迁移并验证完成后，可在 Cloudflare 的 Workers & Pages 中为此 Worker 连接 GitHub 仓库 `z1484052217-ux/Witch-Wild-Hunt`：

| 设置 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 根目录 | `/` |
| 构建命令 | `npm run build` |
| 部署命令 | `npm run deploy` |
| Node 版本 | `22` 或更新 |

发信密钥仅保存在 Worker Secrets，不能作为前端构建变量。只为生产分支连接生产数据库；预览分支需要单独资源，不要让其执行生产迁移。

## 本地预览

复制 `.env.example` 为 `.env`，仅在本地填写测试配置，然后：

```sh
npm run db:migrate:local
npm run dev
```

本地 D1/R2 与线上隔离。`.env`、`.dev.vars`、`.wrangler` 和 `dist` 均被 Git 忽略。

原 Sites 兼容构建保留为可选路径：设置 `DEPLOY_TARGET=sites` 后执行 `npm run build`，与独立 Cloudflare 构建不混用。后台在两种部署中均只使用邮箱验证码。

参考：[Cloudflare Vite 插件](https://developers.cloudflare.com/workers/vite-plugin/)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)、[GitHub 集成](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)。
