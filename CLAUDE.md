# 冒险岛升级计划 开发规则

## 项目信息
- **本地路径**：`/Users/o/Desktop/code/maple-leveling/`
- **GitHub Pages**：`https://syanaooooooo.github.io/maple-leveling/`
- **工作分支**：`main`（直接推 main，自动部署）
- **本地服务器**：`python3 -m http.server 8891`
- **push 惯例**：`git add -A && git commit -m "..." && git push origin main`
- **缓存**：改 style.css / app.js / sync.js 时，index.html 里对应的 `?v=N` 加一

## 沟通方式
- 所有讨论用中文；代码注释、commit message 可中英混用
- 先 scope 后动手；改动前确认；不过度开发

## 数据
- Supabase 项目同 fitness-tracker / bobing 共用
- 主数据：`snapshots` 表，`name='mls_main'`
- localStorage key：`ft` 无关 —— 本项目用 `mls_v1`
- 同步策略：比 `updated_at`，新的赢；本地写入后 600ms debounce 推云端

## 经验表
- `exp-table.js` 里 `EXP[L]` = L 级升 L+1 级所需经验，L = 1…199
- 数值是国服怀旧服（CMS079），和大爆炸后的国际服经验表**完全不同**，别混用
- 改这个表前先跟用户确认版本

## 门禁
- 软密码门禁，SHA-256 哈希硬编码在 `app.js` 的 `PASS_HASH`
- 只拦随手点进来的人。真要防护得上 Supabase RLS + 登录
