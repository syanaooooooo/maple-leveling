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
- Supabase 项目同 fitness-tracker / bobing 共用，但**这个 app 不用共用的 `snapshots` 表**
- 主数据：`maple_data` 表，主键 `user_id`，一个账号一行，开了 RLS
- 建表 SQL 在 `supabase-setup.sql`
- localStorage key：`mls_v1`（退出登录时会清掉）
- 同步策略：比 `updated_at`，新的赢；本地写入后 600ms debounce 推云端

## 经验表
- `exp-table.js` 里 `EXP[L]` = L 级升 L+1 级所需经验，L = 1…199
- 数值是国服怀旧服（CMS079），和大爆炸后的国际服经验表**完全不同**，别混用
- 改这个表前先跟用户确认版本

## 地图表
- `maps.js` 里 `MAPS` = [{ region, maps:[{n, id}] }]，按地区分组
- 来源 mxdzlk.com/map/，怀旧服目前只开放到维多利亚岛，共 272 张图
- 新版本开新大陆时要重新抓一次

## 计时器数据结构
- `c.timer` = { state:'running'|'paused', startedAt, accumMs, points:[{ms, level, exp, map, at}] }
  - `ms` 是有效计时毫秒，暂停期间不累加；`startedAt` 是 epoch，刷新页面不影响计时
  - 一段 = points[i-1] → points[i]，**这段的地图取 points[i-1].map**（打点时选的是「接下来在哪练」）
- `c.sessions` = 终止后的存档，带 points 快照，能重画图表

## 门禁
- 软密码门禁，SHA-256 哈希硬编码在 `app.js` 的 `PASS_HASH`
- 只拦随手点进来的人。真要防护得上 Supabase RLS + 登录
