# 冒险岛升级计划 开发规则

## 项目信息
- **本地路径**：`/Users/o/Desktop/code/maple-leveling/`
- **GitHub Pages**：`https://syanaooooooo.github.io/maple-leveling/`
- **工作分支**：`main`（直接推 main，自动部署）
- **本地服务器**：`python3 -m http.server 8891`
- **push 惯例**：`git add -A && git commit -m "..." && git push origin main`
- **缓存**：改 style.css / app.js / sync.js 时，index.html 里对应的 `?v=N` 加一
  - ⚠️ 改完 **grep 一下确认真的变了**。用 sed/replace 按旧值替换时，值对不上会静默失败 ——
    app.js 曾经卡在 `?v=5` 好几轮没人发现，线上一直吃缓存

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

## 地图表
- `maps.js` 里 `MAPS` = [{ region, maps:[{n, id}] }]，按地区分组
- 来源 mxdzlk.com/map/，怀旧服目前只开放到维多利亚岛，共 272 张图
- 新版本开新大陆时要重新抓一次

## 图表
- `chartHTML(points)` 画的是折线图：横轴 = 计时走过的真实时间（按间隔定位，不是等距），
  纵轴 = 那一段的经验/小时
- Y 轴**按数据自身范围自适应**，上下各留 12%，不硬从 0 起 —— 从 0 起会把起伏压成一条平线
- 值跨 0 时画一条红色虚线标 0；刻度用 `fmtAxis(v, span)` 按量程挑精度，免得小范围下刻度重复
- 贴边的文字要用**内联 `style="text-anchor:..."`**，SVG 里 CSS 的 `text-anchor` 会盖掉同名呈现属性
- 窄屏下图不缩小，`.cchart` 有 `min-width:520px`，靠横向滚动保证字看得清

## 今日计划进度
- `compute()` 里的 `todayGain` / `todayNeed` / `todayPct`
- 起点 = 今天之前最后一条打卡（没有就用计划起点）；现在 = 今天的打卡，
  计时器里有更靠前的打点就用打点（练级中进度条也会动）
- **今日目标用「今天开始时的剩余」算**，一天之内不会因为你打了而缩水
- 允许超过 100%：条填满后变绿，文案显示超出多少

## 计时器数据结构
- `c.timer` = { state:'running'|'paused', startedAt, accumMs, points:[{ms, level, exp, map, at}] }
  - `ms` 是有效计时毫秒，暂停期间不累加；`startedAt` 是 epoch，刷新页面不影响计时
  - 一段 = points[i-1] → points[i]，**这段的地图取 points[i-1].map**（打点时选的是「接下来在哪练」）
- `c.sessions` = 终止后的存档，带 points 快照，能重画图表

## 门禁
- 软密码门禁，SHA-256 哈希硬编码在 `app.js` 的 `PASS_HASH`
- 只拦随手点进来的人。真要防护得上 Supabase RLS + 登录
