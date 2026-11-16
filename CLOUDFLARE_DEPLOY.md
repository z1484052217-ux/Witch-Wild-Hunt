# 静态部署说明

当前部署到现有腾讯云 Nginx，见 DEPLOYMENT.md。本仓库已移除旧 Worker、D1、R2、邮件验证码和管理员 API 的运行代码。

如以后另选静态托管，执行 npm run build，发布 out/；无需 Worker、D1 迁移、R2 绑定或邮件密钥。.openai/hosting.json 保留原 Sites 标识，并声明静态目录 out。本次没有更新原 Sites 发布。

静态化不会删除原 Cloudflare 或 Sites 的数据库、图片、账号配置，本次也没有执行清理。不要继续执行旧版文档中的数据库迁移和 Worker 发布命令。