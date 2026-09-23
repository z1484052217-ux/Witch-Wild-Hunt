# 管理员邮箱验证码

唯一管理员收信邮箱：`1484052217@qq.com`。访客可直接浏览，管理入口为 `/admin`。

## 接入 Resend

1. 用管理员收信邮箱注册 Resend，在 API Keys 创建具有 Sending access 权限的密钥。密钥只放在本地私密配置或线上加密环境变量，不放入聊天、源代码和浏览器页面。
2. 首次测试可用 `onboarding@resend.dev` 发信，但 Resend 仅允许它给注册 Resend 的账户邮箱发送。正式使用自有发信地址时，先在 Resend 完成自有域名验证；不能验证不属于自己的 qq.com。
3. 将以下配置写入 Cloudflare Worker 生产环境，然后构建部署。后台仅接受邮箱验证码登录，未配置完整时拒绝登录。

| 变量 | 值或用途 | 加密 |
| --- | --- | --- |
| ADMIN_AUTH_MODE | email | 否 |
| ADMIN_OTP_EMAIL | 1484052217@qq.com | 否 |
| ADMIN_OTP_SECRET | 随机生成，至少32字符 | 是 |
| RESEND_API_KEY | Resend发送密钥 | 是 |
| EMAIL_FROM | onboarding@resend.dev，或已验证域名的发信地址 | 否 |

使用 `npm run cf -- secret put RESEND_API_KEY --config wrangler.jsonc` 和 `npm run cf -- secret put ADMIN_OTP_SECRET --config wrangler.jsonc` 按提示输入密钥。代码不再使用 `ADMIN_EMAIL`，也不信任访客传入的 ChatGPT 身份标头。完整部署步骤见 [Cloudflare 部署说明](CLOUDFLARE_DEPLOY.md)。

## 使用与校验

进入后台、发送验证码、查看收件箱并输入6位验证码。验证码10分钟有效，最多尝试5次且只可使用一次。发送受邮箱/IP限流保护，会话12小时有效；退出会撤销会话。验证码和会话令牌以哈希形式存储，浏览器会话使用HttpOnly、Secure、SameSite Cookie。

上线前应验证实际收信、输入正确验证码进入后台、退出后权限失效、旧验证码无法再次使用。邮件接口接受请求并不等于收件箱已收到邮件。若收不到，检查垃圾邮件以及Resend投递记录，等待发送倒计时结束后重试。

官方说明：[Cloudflare Workers接入](https://resend.com/docs/send-with-cloudflare-workers)、[测试发信域名限制](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)、[自有域名验证](https://resend.com/docs/dashboard/domains/introduction)。
