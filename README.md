# 冒险岛升级计划

按国服怀旧服（CMS079）经验表，从「当前等级 → 目标等级 → 目标日期」倒推每天要打多少经验。
支持多个角色，各自一套计划；数据存在共用的 Supabase，换电脑打开同一个网址就能接着用。

- 线上：https://syanaooooooo.github.io/maple-leveling/
- 本地：`python3 -m http.server 8891`

## 文件
| 文件 | 作用 |
|---|---|
| `exp-table.js` | CMS079 怀旧服经验表，`EXP[L]` = L 级升 L+1 级所需经验（L = 1…199） |
| `app.js` | 计算、渲染、交互 |
| `sync.js` | Supabase 读写，主数据在 `snapshots` 表 `name='mls_main'` |
| `style.css` | 像素风样式（Zpix + Press Start 2P） |

localStorage key：`mls_v1`

## 怎么算的
- 剩余经验 = (当前等级满级经验 − 本级已有经验) + 中间每一级所需经验之和
- 每日目标 = 剩余经验 ÷ 距目标日期的天数
- 超前/落后 = (已打经验 − 按原计划到今天应打的经验) ÷ 原计划日均

经验表数据来自怀旧冒险岛资料库与冒险岛怀旧服小册子，两处交叉核对一致。

## 改动约定
改 `style.css` / `app.js` 等文件时，`index.html` 里对应的 `?v=N` 加一，避免缓存。
