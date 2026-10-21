// app.js — 冒险岛升级计划

/* ───────────────── 像素小人 ─────────────────
   16×16，照着怀旧服怪物原图自己画的（不是搬游戏素材）。
   参考：mxdzlk.com 的怪物图鉴 —— 绿水灵右上有白高光、花蘑菇伞盖无斑点
   （有白点的是蘑菇仔）、三眼章鱼是紫红不是红、蓝蜗牛壳上有螺旋。 */
const SPRITES = {
  slime: { label:'绿水灵', pal:{'1':'#4E7A24','2':'#A6D04A','3':'#C9E87A','4':'#FFFFFF','5':'#1E2A14'}, g:[
    '................',
    '......111111....',
    '....1122222211..',
    '...122222223331.',
    '..12222222334431',
    '..12222222334431',
    '.122552223334431',
    '.122552223334431',
    '.122222223334431',
    '1222222223344311',
    '1222222222331111',
    '1222266222222221',
    '1222222222222221',
    '.122222222222221',
    '..1111111111111.',
    '................'
  ] },
  mushroom: { label:'花蘑菇', pal:{'1':'#6B3A14','2':'#F2A83B','3':'#FFCE70','4':'#FBF0DC','5':'#2A1C10'}, g:[
    '................',
    '....11111111....',
    '..113333333311..',
    '.13332222223331.',
    '1333222222222331',
    '1322222222222231',
    '1222222222222221',
    '1122222222222211',
    '.11122111122111.',
    '...1444444441...',
    '..144444444441..',
    '..145444445441..',
    '..144444444441..',
    '..144444444441..',
    '...1444444441...',
    '....11111111....'
  ] },
  shroom: { label:'蘑菇仔', pal:{'1':'#5A1C14','2':'#E04A33','3':'#FF8A6A','4':'#FBF0DC','5':'#2A1C10','6':'#FFFFFF'}, g:[
    '................',
    '.....111111.....',
    '...1133333311...',
    '..133222222331..',
    '.13322662222331.',
    '.132222222222231',
    '1322266222662231',
    '1222222222222221',
    '1122222222222211',
    '..111122221111..',
    '...1444444441...',
    '..144444444441..',
    '..145444445441..',
    '..144444444441..',
    '...1444444441...',
    '....11111111....'
  ] },
  pig: { label:'猪猪', pal:{'1':'#8E3A52','2':'#F5A8B8','3':'#FFC9D4','4':'#D4728C','5':'#5A1C2A'}, g:[
    '................',
    '..11........11..',
    '.1221......1221.',
    '.122311111132211',
    '1223333333333221',
    '1233333333333321',
    '1233355333553321',
    '1233333333333321',
    '1233444444333321',
    '1233455554333321',
    '1233444444333321',
    '1233333333333321',
    '.12333333333321.',
    '..133333333331..',
    '...1122112211...',
    '................'
  ] },
  snail: { label:'蓝蜗牛', pal:{'1':'#1E3A6B','2':'#3A6FC4','3':'#7FAEE8','4':'#F5EBD8','5':'#1E2A3A','6':'#C9A86B'}, g:[
    '................',
    '......1111......',
    '....11222211....',
    '...1223333221...',
    '..12233333221...',
    '..123321133221..',
    '.12233122133221.',
    '.12232113312321.',
    '.12233222233221.',
    '.12223333322221.',
    '..122222222221..',
    '...1122222211...',
    '.61144444444116.',
    '6114454444544116',
    '.114444444444411',
    '..1111111111111.'
  ] },
  octo: { label:'三眼章鱼', pal:{'1':'#3A1C3A','2':'#C4568F','3':'#E07AAE','4':'#7A4A8F','5':'#FFFFFF','6':'#2A1030'}, g:[
    '................',
    '.....111111.....',
    '...11444444111..',
    '..1444444444441.',
    '.144444444444441',
    '.144415551544441',
    '1442165612564421',
    '1422255515522221',
    '1223333333333221',
    '1233333333333321',
    '1233333333333321',
    '1223333333333221',
    '.12222222222221.',
    '.11211211211211.',
    '1.1.1.1..1.1.1.1',
    '................'
  ] },
}
const SPRITE_KEYS = Object.keys(SPRITES)

function spriteSVG(key) {
  const s = SPRITES[key] || SPRITES.mushroom
  let r = ''
  s.g.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = s.pal[row[x]]
      if (c) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`
    }
  })
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${r}</svg>`
}

/* ───────────────── 工具 ───────────────── */
const DAY = 86400000
const pad = n => String(n).padStart(2, '0')
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const today = () => iso(new Date())
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / DAY)
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d) }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function fmt(n) {
  n = Math.round(n)
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (n >= 1e6) return Math.round(n / 1e4) + '万'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万'
  return n.toLocaleString('en-US')
}
const full = n => Math.round(n).toLocaleString('en-US')
const mmdd = s => s ? s.slice(5).replace('-', '/') : '—'

/* ───────────────── 经验计算 ───────────────── */
const expAt = lv => EXP[lv] || 0
// 「浮点等级」：Lv.43 打了 98% 就是 43.98。整套计划的算术都以它为单位
const levelFloat = (lv, exp) => lv + (expAt(lv) > 0 ? Math.min(1, exp / expAt(lv)) : 0)

// 从 (lv, exp) 往前推 n 级（n 可以是小数）。跨级时余下的零头按新等级的经验量算 ——
// 「一级」在这里是个单位，不管这一级本身要多少经验
function advanceLevels(lv, exp, n) {
  let L = lv
  let frac = (expAt(L) > 0 ? exp / expAt(L) : 0) + Math.max(0, n)
  while (L < 200 && frac >= 1) { frac -= 1; L++ }
  return { level: L, exp: L >= 200 ? 0 : Math.round(frac * expAt(L)) }
}

// 从位置 a 打到位置 b 需要多少经验
const expFromTo = (a, b) =>
  Math.max(0, expBetween(a.level, a.exp, 200) - expBetween(b.level, b.exp, 200))

// 从 (lv, exp) 再打 gain 经验之后落在哪一级的百分之几
function advance(lv, exp, gain) {
  let L = lv, e = exp + Math.max(0, gain)
  while (L < 200 && e >= expAt(L)) { e -= expAt(L); L++ }
  return { level: L, exp: L >= 200 ? 0 : e }
}
// 「Lv.44 · 30.15%」这种写法 —— 游戏里就是这么显示的，比绝对经验值好对照
const fmtPos = p => `Lv.${p.level} · ${(expAt(p.level) > 0 ? p.exp / expAt(p.level) * 100 : 0).toFixed(2)}%`
function expBetween(lv, exp, toLv) {
  if (toLv <= lv) return 0
  let t = Math.max(0, expAt(lv) - exp)
  for (let l = lv + 1; l < toLv; l++) t += expAt(l)
  return t
}

/* ───────────────── 状态 ───────────────── */
const LS = 'mls_v1'
const LS_BAK = 'mls_backup'   // 本机快照，防止一次坏同步把数据冲掉
let S = { chars: [], activeId: null, updated_at: null }
let UI = {
  expUnit: localStorage.getItem('mls_unit') || 'pct',
  showTable: localStorage.getItem('mls_tbl') === '1',
  region: localStorage.getItem('mls_region') || MAPS[0].region,
  map: localStorage.getItem('mls_map') || '',
  tab: localStorage.getItem('mls_tab') || 'plan',
  hday: null,
  mult: Number(localStorage.getItem('mls_mult')) || 1,
}
let saveTimer = null

function loadLocal() {
  try { const r = localStorage.getItem(LS); if (r) S = Object.assign(S, JSON.parse(r)) } catch (e) { console.warn(e) }
  migrateAll()
}
function save(push = true) {
  S.updated_at = new Date().toISOString()
  localStorage.setItem(LS, JSON.stringify(S))
  backupLocal('保存')
  if (push) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveToCloud(S), 600)
  }
}
const activeChar = () => S.chars.find(c => c.id === S.activeId) || S.chars[0] || null

// 本机备份：只存有内容的状态，留最近 5 份。纯本地，不上云
function backupLocal(reason) {
  if (!S.chars || !S.chars.length) return
  try {
    const list = JSON.parse(localStorage.getItem(LS_BAK) || '[]')
    const last = list[0]
    const body = JSON.stringify(S)
    if (last && last.body === body) return        // 没变就不重复存
    list.unshift({ at: new Date().toISOString(), reason, chars: S.chars.length, body })
    localStorage.setItem(LS_BAK, JSON.stringify(list.slice(0, 5)))
  } catch (e) { console.warn('本机备份失败:', e) }
}
function readBackups() {
  try { return JSON.parse(localStorage.getItem(LS_BAK) || '[]') } catch (e) { return [] }
}

/* ───────────────── 记录（marks） ─────────────────
   原来一天只能有一条打卡（c.logs[date] 会被覆盖）。现在改成一条条的流水 c.marks，
   一天想记几次记几次，每条带时间。

   c.logs 还在，变成**派生的镜像**（每天最后一条）—— 不是冗余偷懒：
   另一台机器可能还吃着缓存跑旧代码，旧代码只认 c.logs。
   镜像留着，旧代码读到的仍是对的，不会「看见空的」再同步回来把数据冲掉。 */

const nowLocal = () => {
  const d = new Date()
  return iso(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}
// 排序键：老数据没有时刻，当成那天最早的一笔（迁移时它确实在新记录之前）
const markKey = m => m.at || (m.d + 'T00:00')
const sortedMarks = c => (c.marks || []).slice().sort((a, b) => markKey(a) < markKey(b) ? -1 : markKey(a) > markKey(b) ? 1 : 0)
// 跨时区/跨格式都能拿到「本地的那一天」：UTC 的 ISO 和不带偏移的本地 ISO 都吃得下
const localDay = s => { const d = new Date(s); return isNaN(d) ? String(s).slice(0, 10) : iso(d) }

// 老数据迁移 + 新字段补齐。返回有没有动过，动过才需要存
function migrateChar(c) {
  let changed = false
  if (!Array.isArray(c.marks)) {
    c.marks = Object.keys(c.logs || {}).sort().map(d => ({
      id: 'm' + d, d, at: null, level: c.logs[d].level, exp: c.logs[d].exp
    }))
    changed = true
  }
  // 另一台机器吃着缓存跑旧代码时，打卡只写进 c.logs。和 marks 对不上的那天补一笔，
  // 时刻记成当天 23:59 —— 让它成为那天最后一笔，下次加载就对得上，不会重复补
  const lastOfDay = {}
  for (const m of sortedMarks(c)) lastOfDay[m.d] = m
  for (const d of Object.keys(c.logs || {})) {
    const L = c.logs[d], m = lastOfDay[d]
    if (L && (!m || m.level !== L.level || m.exp !== L.exp)) {
      c.marks.push({ id: 'm' + d + '_' + L.level + '_' + L.exp, d, at: d + 'T23:59', level: L.level, exp: L.exp })
      changed = true
    }
  }
  if (!Array.isArray(c.goals)) { c.goals = []; changed = true }
  // 以前的角色一定有目标；没有目标等级的（理论上不存在）算平日记录
  if (typeof c.goalOn !== 'boolean') { c.goalOn = !!(c.targetLevel && c.targetDate); changed = true }
  // 别处早就打到目标的，这里补归档。只改内存不立刻存 —— 启动时一存就会把本地
  // updated_at 抬高，压过另一台机器上可能更新的云端数据。下一次真实操作时一起存
  if (checkGoalDone(c)) changed = true
  return changed
}
function migrateAll() {
  let changed = false
  for (const c of S.chars || []) if (migrateChar(c)) changed = true
  return changed
}

// 重建 c.logs 镜像：每天保留最后一条
function syncLogs(c) {
  const o = {}
  for (const m of sortedMarks(c)) o[m.d] = { level: m.level, exp: m.exp }
  c.logs = o
}

function pushMark(c, level, exp) {
  c.marks = c.marks || []
  c.marks.push({
    id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    d: today(), at: nowLocal(), level, exp
  })
  syncLogs(c)
  return checkGoalDone(c)
}

function currentOf(c) {
  const ms = sortedMarks(c)
  if (ms.length) { const m = ms[ms.length - 1]; return { level: m.level, exp: m.exp, date: m.d } }
  return { level: c.startLevel, exp: c.startExp, date: c.startDate }
}

/* ── 目标生命周期 ──
   goalOn=true 期间每一笔记录都算进目标；达成就自动归档进 c.goals，
   goalOn 变 false，回到平日记录。不用切页面，也不用手动点「完成」。 */
function archiveGoal(c, how) {
  let end = currentOf(c)
  let endDate = today()
  if (how === '达成') {
    // 用「第一次够到目标」的那一笔，不是今天 —— 老数据可能早就达成了，只是现在才归档
    const hit = sortedMarks(c).find(m => m.d >= c.startDate && levelFloat(m.level, m.exp) + 1e-9 >= c.targetLevel)
    if (hit) { end = hit; endDate = hit.d }
  }
  c.goals = c.goals || []
  c.goals.push({
    id: 'g' + Date.now().toString(36),
    startDate: c.startDate, startLevel: c.startLevel, startExp: c.startExp,
    targetLevel: c.targetLevel, targetDate: c.targetDate,
    endDate, endLevel: end.level, endExp: end.exp,
    how
  })
  c.goalOn = false
}
function checkGoalDone(c) {
  if (!c.goalOn) return false
  const cur = currentOf(c)
  if (levelFloat(cur.level, cur.exp) + 1e-9 < c.targetLevel) return false
  archiveGoal(c, '达成')
  return true
}

function compute(c) {
  const cur = currentOf(c)
  const t = today()
  const totalPlan = expBetween(c.startLevel, c.startExp, c.targetLevel)
  const remain = expBetween(cur.level, cur.exp, c.targetLevel)
  const done = Math.max(0, totalPlan - remain)
  const pct = totalPlan > 0 ? clamp(done / totalPlan * 100, 0, 100) : 100
  const totalDays = Math.max(1, diffDays(c.startDate, c.targetDate))
  const elapsed = clamp(diffDays(c.startDate, t), 0, 100000)
  // 小数天：今天过了多少也算进分母。
  // 用整数天会把今天打的经验算进分子、却不算进分母 —— 计划第二天的上午，
  // 一天半的战果除以 1 天，「实际每天」会虚高五成，ETA 跟着乐观
  const elapsedDays = Math.max(0, (Date.now() - parseD(c.startDate).getTime()) / DAY)
  const daysLeft = diffDays(t, c.targetDate)

  // ── 计划以「级数」为单位，不是经验 ──
  // 等级越高每只怪给的经验越多，所以固定级数 ≈ 固定练级时间，固定经验不是
  const startLF = levelFloat(c.startLevel, c.startExp)
  const curLF = levelFloat(cur.level, cur.exp)
  const levelsTotal = Math.max(0, c.targetLevel - startLF)
  const levelsDone = Math.max(0, curLF - startLF)
  const levelsLeft = Math.max(0, c.targetLevel - curLF)

  const lvPerDayPlan = levelsTotal / totalDays                        // 原计划每天升几级
  const lvPerDay = daysLeft > 0 ? levelsLeft / daysLeft : levelsLeft  // 现在还得每天升几级
  // 换算成经验只是为了显示：从当前位置往前推 lvPerDay 级要多少经验
  const dailyNeed = expFromTo(cur, advanceLevels(cur.level, cur.exp, lvPerDay))
  const dailyPlan = totalDays > 0 ? totalPlan / totalDays : 0         // 旧口径，只在文案里提一嘴

  const expectedLevels = Math.min(levelsTotal, lvPerDayPlan * elapsedDays)
  const aheadDays = lvPerDayPlan > 0 ? (levelsDone - expectedLevels) / lvPerDayPlan : 0
  // 不足 6 小时的数据不配算速度 —— 刚建好计划打了五分钟，会推出「明天就达成」
  const paceLevels = elapsedDays >= 0.25 ? levelsDone / elapsedDays : 0
  const etaDate = (paceLevels > 0 && levelsLeft > 0)
    ? addDays(t, Math.ceil(levelsLeft / paceLevels)) : null
  const finished = remain <= 0

  // ── 今日 ──
  // 今天开始时的位置：今天之前最后一条记录，没有就用计划起点
  const ms = sortedMarks(c)
  const before = ms.filter(m => m.d < t)
  const dayFrom = before.length ? before[before.length - 1] : { level: c.startLevel, exp: c.startExp }
  // 现在的位置：今天最后一条记录；计时器里有更靠前的打点就用打点，这样练级中进度条也会动
  const inToday = ms.filter(m => m.d === t)
  let dayNow = inToday.length ? inToday[inToday.length - 1] : dayFrom
  const tp = c.timer && c.timer.points && c.timer.points[c.timer.points.length - 1]
  if (tp && expBetween(tp.level, tp.exp, 200) < expBetween(dayNow.level, dayNow.exp, 200)) dayNow = tp
  const todayGain = Math.max(0,
    expBetween(dayFrom.level, dayFrom.exp, 200) - expBetween(dayNow.level, dayNow.exp, 200))
  // 今日目标用「今天开始时的位置」算，一天之内不会因为你打了而缩水
  const dayFromLF = levelFloat(dayFrom.level, dayFrom.exp)
  const todayLevels = Math.max(0, c.targetLevel - dayFromLF) / Math.max(1, daysLeft)
  const dayGoalPos = advanceLevels(dayFrom.level, dayFrom.exp, todayLevels)
  const dayNowPos = { level: dayNow.level, exp: dayNow.exp }
  const todayNeed = expFromTo(dayFrom, dayGoalPos)
  const todayPct = todayNeed > 0 ? todayGain / todayNeed * 100 : (todayGain > 0 ? 100 : 0)
  // 今天已经升了多少级 —— 和 todayLevels 同单位，这样「要升 33.0%、已升 54.9%」能直接对比
  const todayGainLevels = Math.max(0, levelFloat(dayNow.level, dayNow.exp) - dayFromLF)

  return { cur, totalPlan, remain, done, pct, totalDays, elapsed, daysLeft, dailyPlan, dailyNeed,
           aheadDays, paceLevels, etaDate, finished, lvPerDay, lvPerDayPlan,
           levelsTotal, levelsDone, levelsLeft, todayGain, todayNeed, todayPct, todayLevels, todayGainLevels,
           dayGoalPos, dayNowPos }
}

/* ───────────────── 渲染 ───────────────── */
const app = () => document.getElementById('app')

function tabBar() {
  const t = UI.tab === 'log' ? 'log' : 'plan'
  return `<section class="panel tabs">
    <button class="tabbtn ${t === 'plan' ? 'on' : ''}" data-tab="plan">计划</button>
    <button class="tabbtn ${t === 'log' ? 'on' : ''}" data-tab="log">记录</button>
  </section>`
}

function render() {
  if (!S.chars.length) { app().innerHTML = recoverBanner() + welcomeView(); return }
  const c = activeChar()
  if (!c) { S.activeId = S.chars[0].id }
  let view
  if (UI.tab === 'log') {
    // 「记录」tab 管回顾：热力图 → 目标历史 → 流水 → 效率 → 练级存档
    view = heatPanel(c) + goalsPanel(c) + marksPanel(c) + statsPanel(c) + sessionsPanel(c)
  } else if (c.goalOn) {
    const k = compute(c)
    view = overview(c, k) + markPanel(c, k) + timerPanel(c) + planPanel(c, k) + tablePanel(c, k)
  } else {
    // 平日记录：同一个「记一笔」入口，只是没有目标压着
    view = idlePanel(c) + markPanel(c, null) + timerPanel(c) + charSettings(c)
  }
  app().innerHTML = charBar() + tabBar() + view
  // 窄屏下热力图横滚，默认停在最右（最近几周），老的往左翻
  const hw = document.querySelector('.hmwrap')
  if (hw) hw.scrollLeft = hw.scrollWidth
  syncTick()
}

function charBar() {
  if (managing) return manageBar()
  const chips = S.chars.map(c => {
    const cur = currentOf(c)
    return `<div class="chip ${c.id === S.activeId ? 'on' : ''}" data-pick="${c.id}">
      ${spriteSVG(c.sprite)}
      <span><b>${esc(c.name)}</b><small class="en">Lv.${cur.level}${c.goalOn ? ' → ' + c.targetLevel : ''}</small></span>
    </div>`
  }).join('')
  return `<section class="panel">
    <div class="panel-t">我的角色<span class="sub">${S.chars.length} 个</span>
      <button class="btn tiny" id="manage-on" style="margin-left:8px">管理</button></div>
    <div class="chars">${chips}<div class="chip add" data-new="1">＋ 新角色</div></div>
  </section>`
}

// 管理模式：列表形态，每行能改名、删除，看得见各自的进度
function manageBar() {
  const rows = S.chars.map(c => {
    const cur = currentOf(c)
    const i = S.chars.indexOf(c)
    const prog = c.goalOn ? compute(c).pct.toFixed(0) + '%' : '平日记录'
    return `<div class="mrow">
      <span class="mrow-ord">
        <button class="btn tiny" data-move="${c.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="往前挪">←</button>
        <button class="btn tiny" data-move="${c.id}" data-dir="1" ${i === S.chars.length - 1 ? 'disabled' : ''} title="往后挪">→</button>
      </span>
      <span class="mrow-s">${spriteSVG(c.sprite)}</span>
      <input type="text" class="mrow-name" data-rename="${c.id}" value="${esc(c.name)}">
      <span class="mrow-i en">Lv.${cur.level}${c.goalOn ? ' → ' + c.targetLevel : ''}</span>
      <span class="mrow-i hint">${prog} · ${(c.marks || []).length} 笔 · ${(c.sessions || []).length} 次练级</span>
      <button class="btn tiny danger" data-del="${c.id}">删除</button>
    </div>`
  }).join('')
  return `<section class="panel">
    <div class="panel-t">管理角色<span class="sub">${S.chars.length} 个</span>
      <button class="btn tiny" id="manage-off" style="margin-left:8px">完成</button></div>
    <div class="mlist">${rows}</div>
    <div class="hint" style="margin-top:10px">← → 调角色条里的先后顺序。改完名字点别处就存上了。删除会连着这个角色的记录和练级存档一起没掉，不能撤销。</div>
  </section>`
}

function overview(c, k) {
  let badge
  if (k.finished) badge = `<span class="badge done">🎉 已达成目标</span>`
  else if (k.daysLeft < 0) badge = `<span class="badge behind">已过目标日期 ${-k.daysLeft} 天</span>`
  else if (k.aheadDays >= 0.5) badge = `<span class="badge ahead">超前 ${k.aheadDays.toFixed(1)} 天</span>`
  else if (k.aheadDays <= -0.5) badge = `<span class="badge behind">落后 ${(-k.aheadDays).toFixed(1)} 天</span>`
  else badge = `<span class="badge ontime">刚好跟上计划</span>`

  // 每天要打一级的百分之多少 —— 这是计划的真正单位
  const dayPctText = (k.lvPerDay * 100).toFixed(1) + '%'
  const lvText = k.lvPerDay > 0
    ? `≈ ${(1 / k.lvPerDay).toFixed(1)} 天升 1 级 · 按 Lv.${k.cur.level} 约 ${fmt(k.dailyNeed)} 经验`
    : '—'

  const curPct = expAt(k.cur.level) > 0 ? (k.cur.exp / expAt(k.cur.level) * 100) : 0

  const curPctText = curPct.toFixed(2) + '%'
  const done = k.todayPct >= 100

  return `<section class="panel">
    <div class="panel-t">总进度<span class="sub">${c.startDate} → ${c.targetDate}</span></div>

    <div class="who">
      <div class="who-face">${spriteSVG(c.sprite)}</div>
      <div class="who-txt">
        <div class="who-name">${esc(c.name)}${c.job ? ` <span class="hint">${esc(c.job)}</span>` : ''}</div>
        <div class="who-lv en">Lv.${k.cur.level} · ${curPctText}</div>
      </div>
      ${badge}
    </div>

    ${k.finished ? '' : `
    <div class="today">
      <div class="today-head">今天<b>要升 ${(k.todayLevels * 100).toFixed(1)}%</b> 一级</div>
      <div class="bar day big ${done ? 'over' : ''}">
        <span style="width:${Math.min(100, k.todayPct).toFixed(1)}%"></span>
        <em class="en">${k.todayPct.toFixed(0)}%</em>
      </div>
      <div class="say ${done ? 'ok' : ''}">
        ${done
          ? `已达标 · 已升 ${(k.todayGainLevels * 100).toFixed(1)}%，超出 ${((k.todayGainLevels - k.todayLevels) * 100).toFixed(1)}%`
          : `还差 ${((k.todayLevels - k.todayGainLevels) * 100).toFixed(1)}% · 打到 <b class="en">${fmtPos(k.dayGoalPos)}</b>`}
      </div>
    </div>`}

    <div class="overall">
      <span class="overall-k">整体</span>
      <div class="bar mini"><span style="width:${k.pct.toFixed(2)}%"></span><em class="en">${k.pct.toFixed(1)}%</em></div>
      <span class="overall-v"><b class="en">${k.levelsDone.toFixed(2)} / ${k.levelsTotal.toFixed(2)}</b> 级 · 还剩 ${fmt(k.remain)} 经验</span>
    </div>

    <div class="stats">
      <div class="stat hero"><div class="k">每天要打</div><div class="v">${dayPctText}<small> 一级</small></div><div class="n">${lvText}</div></div>
      <div class="stat"><div class="k">剩余天数</div><div class="v en">${k.daysLeft > 0 ? k.daysLeft : (k.daysLeft === 0 ? '今天' : '超时')}</div><div class="n">目标 ${c.targetDate}</div></div>
      <div class="stat"><div class="k">按当前速度</div><div class="v">${k.etaDate ? mmdd(k.etaDate) : '—'}</div><div class="n">${k.etaDate ? '预计 ' + k.etaDate + ' 达成' : '数据还不够'}${k.paceLevels > 0 ? ` · 实际每天 ${(k.paceLevels * 100).toFixed(1)}%` : ''}</div></div>
    </div>
  </section>`
}

// 记一笔 —— 有目标没目标都是同一个入口。
// 有目标：这笔算进目标进度。没目标：就是平日流水，照样进热力图
function markPanel(c, k) {
  const cur = k ? k.cur : currentOf(c)
  const cap = expAt(cur.level)
  const unitPct = UI.expUnit === 'pct'
  const val = unitPct ? (cap > 0 ? (cur.exp / cap * 100).toFixed(2) : '0') : cur.exp
  const mine = (c.marks || []).filter(m => m.d === today())
  const last = mine.length ? mine[mine.length - 1] : null
  const sub = mine.length
    ? `${today()} · 今天记了 ${mine.length} 笔${last && last.at ? '，最后一笔 ' + last.at.slice(11) : ''}`
    : today()
  return `<section class="panel">
    <div class="panel-t">记一笔<span class="sub">${sub}</span></div>
    <div class="row">
      <div class="field" style="flex:0 0 110px">
        <label>当前等级</label>
        <input type="text" inputmode="numeric" class="numin" id="in-lv" value="${cur.level}">
      </div>
      <div class="field" style="flex:1 1 160px">
        <label>本级经验${unitPct ? '（%）' : '（点）'}</label>
        <input type="text" inputmode="numeric" class="numin ${unitPct ? 'pctin' : ''}" id="in-exp" value="${val}">
      </div>
      <div class="field" style="flex:0 0 auto">
        <label>单位</label>
        <div class="seg">
          <button data-unit="pct" class="${unitPct ? 'on' : ''}">百分比</button>
          <button data-unit="raw" class="${unitPct ? '' : 'on'}">经验值</button>
        </div>
      </div>
      <button class="btn primary" id="btn-log">记一笔</button>
    </div>
    <div class="hint" style="margin-top:8px">本级共需 <b class="en">${full(cap)}</b> 经验${cap > 0 ? `，还差 <b class="en">${full(Math.max(0, cap - cur.exp))}</b> 升下一级` : ''}。
      一天想记几次记几次，每笔都带时刻，都会进「记录」里的热力图。${k ? '现在有目标在跑，这笔也算进目标进度。' : ''}</div>
  </section>`
}

function planPanel(c, k) {
  // 目标等级只能选比当前高的 —— 选个已经过了的等级没有意义
  const minT = Math.min(200, k.cur.level + 1)
  const opts = []
  for (let l = minT; l <= 200; l++) {
    opts.push(`<option value="${l}" ${l === c.targetLevel ? 'selected' : ''}>Lv.${l}</option>`)
  }
  const sCap = expAt(c.startLevel)
  const sPct = sCap > 0 ? (c.startExp / sCap * 100).toFixed(2) : '0.00'

  return `<section class="panel">
    <div class="panel-t">计划<span class="sub">${c.startDate} → ${c.targetDate}</span></div>

    <div class="plan-k">目标</div>
    <div class="row">
      <div class="field"><label>目标等级</label><select id="in-tlv">${opts.join('')}</select></div>
      <div class="field"><label>目标日期</label><input type="date" id="in-tdate" value="${c.targetDate}"></div>
      <button class="btn primary" id="btn-target">更新目标</button>
    </div>
    <div class="hint" style="margin-top:6px">原计划每天升 <b class="en">${(k.lvPerDayPlan * 100).toFixed(1)}%</b> 一级 · 计划总长 <b class="en">${k.totalDays}</b> 天 · 已过 <b class="en">${k.elapsed}</b> 天</div>

    <div class="sep"></div>

    <div class="plan-k">起点<span class="plan-k-sub">现在是 ${fmtPos({ level: c.startLevel, exp: c.startExp })} · ${c.startDate}</span></div>
    <div class="row">
      <div class="field"><label>起点日期</label><input type="date" id="in-sdate" value="${c.startDate}"></div>
      <div class="field" style="flex:0 0 100px"><label>起点等级</label>
        <input type="text" inputmode="numeric" class="numin" id="in-slv" value="${c.startLevel}"></div>
      <div class="field" style="flex:0 0 130px"><label>本级经验（%）</label>
        <input type="text" inputmode="numeric" class="numin pctin" id="in-spct" value="${sPct}"></div>
      <button class="btn ghost" id="btn-start">重设起点</button>
    </div>
    <div class="hint" style="margin-top:6px">起点决定「已升多少级」和进度条从哪算起，改了会整体重算。记录和练级存档都保留。</div>

    <div class="sep"></div>
    <div class="row" style="align-items:center">
      <button class="btn ghost" id="btn-goal-end">结束这个目标</button>
      <span class="hint">到达目标等级会自动结束。不想打了也可以手动结束，一样归档进「记录」里的目标历史。</span>
    </div>

    <div class="sep"></div>
    ${charSettingsInner(c)}
  </section>`
}

// 名字 / 职业 / 头像 / 删除 —— 有没有目标都要能改
function charSettingsInner(c) {
  const picks = SPRITE_KEYS.map(key =>
    `<div class="pick ${key === c.sprite ? 'on' : ''}" data-sprite="${key}" title="${SPRITES[key].label}">${spriteSVG(key)}</div>`).join('')
  return `<details class="more">
      <summary>角色设置</summary>
      <div class="row" style="margin-top:8px">
        <div class="field"><label>名字</label><input type="text" id="in-name" value="${esc(c.name)}"></div>
        <div class="field"><label>职业（可空）</label><input type="text" id="in-job" value="${esc(c.job || '')}"></div>
        <button class="btn" id="btn-name">保存</button>
      </div>
      <div class="field" style="margin-top:10px"><label>头像</label><div class="picks">${picks}</div></div>
      <div class="sep"></div>
      <button class="btn danger" id="btn-del">删除角色</button>
    </details>`
}
const charSettings = c => `<section class="panel">${charSettingsInner(c)}</section>`

/* ───────────────── 平日记录（没有目标的时候） ───────────────── */
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const pctLv = n => (n * 100).toFixed(1) + '%'
// 累计值（7 天 / 30 天 / 周几合计）常常超过一级，「150.9% 一级」读着别扭，改说「1.51 级」
const sumLv = n => n >= 1 ? n.toFixed(2) + ' 级' : pctLv(n) + ' 一级'

// 最后一次「等级变了」是哪天 —— 回答「多久没升级了」
function lastLevelUp(c) {
  const ms = sortedMarks(c)
  for (let i = ms.length - 1; i > 0; i--) if (ms[i].level > ms[i - 1].level) return ms[i].d
  return null
}

function idlePanel(c) {
  const cur = currentOf(c)
  const capP = expAt(cur.level) > 0 ? (cur.exp / expAt(cur.level) * 100).toFixed(2) : '0.00'
  const gs = c.goals || []
  const g = gs[gs.length - 1]
  const recent = g && diffDays(g.endDate, today()) <= 7
  const doneLine = recent
    ? `<div class="donebox">${g.how === '达成' ? '🎉 目标达成' : '目标已结束'}：
        <b class="en">Lv.${g.startLevel} → Lv.${g.endLevel}</b>，${mmdd(g.startDate)} → ${mmdd(g.endDate)}，用了 ${Math.max(1, diffDays(g.startDate, g.endDate))} 天。
        现在是平日记录，想冲下一轮就在下面订个新目标。</div>` : ''

  const days = dayStats(c)
  const w7 = sumGain(days, addDays(today(), -6), today())
  const up = lastLevelUp(c)
  const upTxt = up ? (up === today() ? '今天刚升过级' : `上次升级是 ${diffDays(up, today())} 天前`) : '还没记到过升级'

  const minT = Math.min(200, cur.level + 1)
  const opts = []
  for (let l = minT; l <= 200; l++) opts.push(`<option value="${l}" ${l === Math.min(200, cur.level + 5) ? 'selected' : ''}>Lv.${l}</option>`)

  return `<section class="panel">
    <div class="panel-t">平日记录<span class="sub">没有进行中的目标</span></div>
    <div class="who">
      <div class="who-face">${spriteSVG(c.sprite)}</div>
      <div class="who-txt">
        <div class="who-name">${esc(c.name)}${c.job ? ` <span class="hint">${esc(c.job)}</span>` : ''}</div>
        <div class="who-lv en">Lv.${cur.level} · ${capP}%</div>
      </div>
      <span class="badge ontime">平日</span>
    </div>
    ${doneLine}
    <div class="say">最近 7 天升了 <b class="en">${sumLv(w7)}</b> · ${upTxt}</div>

    <div class="sep"></div>
    <div class="plan-k">订个新目标<span class="plan-k-sub">起点就是现在 ${fmtPos(cur)}</span></div>
    <div class="row">
      <div class="field"><label>目标等级</label><select id="g-tlv">${opts.join('')}</select></div>
      <div class="field"><label>目标日期</label><input type="date" id="g-tdate" value="${addDays(today(), 30)}"></div>
      <button class="btn primary" id="btn-goal-new">开始这个目标</button>
    </div>
  </section>`
}

/* ───────────────── 记录 tab：热力图 + 分析 ───────────────── */

// 按天汇总。一天的「升了多少级」= 当天最后一笔 − 前一个有记录的日子的最后一笔（净值）。
// 用净值不用逐笔累加：中间记错一笔倒退的，逐笔累加会把回弹算成「又升了」
function dayStats(c) {
  const days = {}
  const ms = sortedMarks(c)
  let prevLF = null
  let i = 0
  while (i < ms.length) {
    const d = ms[i].d
    let n = 0, lastM = null
    while (i < ms.length && ms[i].d === d) { lastM = ms[i]; n++; i++ }
    const lf = levelFloat(lastM.level, lastM.exp)
    const gain = prevLF === null ? 0 : Math.max(0, lf - prevLF)  // 第一天没有参照；死亡掉经验不算负
    days[d] = { d, marks: n, gain, level: lastM.level, lf, sessMs: 0, sess: 0 }
    prevLF = lf
  }
  for (const s of c.sessions || []) {
    if (!s.startedAt) continue
    const d = localDay(s.startedAt)
    const a = days[d] || (days[d] = { d, marks: 0, gain: 0, level: null, lf: null, sessMs: 0, sess: 0 })
    a.sessMs += s.ms || 0
    a.sess++
  }
  return days
}
const sumGain = (days, from, to) =>
  Object.values(days).reduce((t, x) => t + (x.d >= from && x.d <= to ? x.gain : 0), 0)
// 「练了」的门槛：升了 0.5% 以上，或者那天有计时存档
const isActive = x => x && (x.gain >= 0.005 || x.sessMs > 0)

function analyze(days) {
  const keys = Object.keys(days).sort()
  const act = keys.filter(d => isActive(days[d]))
  let best = null
  for (const d of keys) if (!best || days[d].gain > best.gain) best = days[d]
  // 连续练级：按日历天算，中间断一天就断
  let longest = 0, run = 0, prev = null, longestEnd = null
  for (const d of act) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1
    if (run > longest) { longest = run; longestEnd = d }
    prev = d
  }
  // 当前连续：从今天（或昨天，今天还没练不算断）往回数
  let streak = 0
  const set = new Set(act)
  let p = set.has(today()) ? today() : addDays(today(), -1)
  while (set.has(p)) { streak++; p = addDays(p, -1) }
  // 最长空窗：两个「练了」的日子之间隔了多少天没练
  let gap = null
  for (let i = 1; i < act.length; i++) {
    const n = diffDays(act[i - 1], act[i]) - 1
    if (n > 0 && (!gap || n > gap.n)) gap = { n, from: addDays(act[i - 1], 1), to: addDays(act[i], -1) }
  }
  const sinceLast = act.length ? diffDays(act[act.length - 1], today()) : null
  // 周几分布：按周几把升的级数加起来
  const wk = [0, 0, 0, 0, 0, 0, 0]
  for (const d of keys) wk[parseD(d).getDay()] += days[d].gain
  const total = keys.reduce((t, d) => t + days[d].gain, 0)
  return { keys, act, best, longest, longestEnd, streak, gap, sinceLast, wk, total }
}

function heatSVG(days, sel) {
  const alignMon = s => addDays(s, -((parseD(s).getDay() + 6) % 7))
  const keys = Object.keys(days).sort()
  const endMon = alignMon(today())
  const MAXW = 53
  // 格子按真实像素画，不拉伸 —— 以前 width:100% 把 20 周撑满整行，格子被放大两倍多。
  // 周数改成「这一行放得下几周就画几周」，记录跨度更长就横滚（默认停在最右）
  const C = 18, ST = 22, GX = 30, GY = 26
  // main 左右内边距 32 + 面板内边距 28 + 白框内边距 16 + 余量 4。还没排版（宽度量不到）时按 800 算
  const aw = app() ? app().clientWidth : 0
  const avail = (aw > 200 ? aw : 800) - 32 - 28 - 16 - 4
  const fit = clamp(Math.floor((avail - GX - 4) / ST), 10, MAXW)
  let startMon = alignMon(keys[0] || today())
  let weeks = Math.floor(diffDays(startMon, endMon) / 7) + 1
  if (weeks < fit) { startMon = addDays(endMon, -(fit - 1) * 7); weeks = fit }
  if (weeks > MAXW) { startMon = addDays(endMon, -(MAXW - 1) * 7); weeks = MAXW }

  const W = GX + weeks * ST + 4, H = GY + 7 * ST + 4
  const gains = keys.filter(d => d >= startMon).map(d => days[d].gain).filter(g => g > 0)
  // 色阶按自己的最大值走，但至少 0.3 级才算满格 —— 免得只记过一点点也全是深绿
  const top = Math.max(0.3, ...gains)
  const bucket = g => g <= 0 ? 0 : Math.min(4, Math.ceil(g / top * 4))

  let cells = '', months = '', lastM = -1
  for (let w = 0; w < weeks; w++) {
    const mon = addDays(startMon, w * 7)
    const m = parseD(mon).getMonth()
    if (m !== lastM) {
      months += `<text class="hm-m" x="${GX + w * ST}" y="16">${m + 1}月</text>`
      lastM = m
    }
    for (let r = 0; r < 7; r++) {
      const d = addDays(mon, r)
      if (d > today()) continue
      const x = days[d]
      const lv = x ? (x.marks ? (x.gain > 0 ? 'g' + bucket(x.gain) : 'g0') : 'gs') : 'none'
      const tip = x
        ? `${d} 周${WEEK[parseD(d).getDay()]} · ${x.marks ? '升 ' + pctLv(x.gain) + ' 一级 · ' + x.marks + ' 笔' : '没记等级'}${x.sess ? ' · 计时 ' + fmtShort(x.sessMs) : ''}`
        : `${d} 周${WEEK[parseD(d).getDay()]} · 没有记录`
      const X = GX + w * ST, Y = GY + r * ST
      cells += `<rect class="hm ${lv}${d === today() ? ' today' : ''}${d === sel ? ' sel' : ''}" data-hday="${d}" x="${X}" y="${Y}" width="${C}" height="${C}"><title>${tip}</title></rect>`
      if (x && x.sess) cells += `<rect class="hm-s" x="${X + C - 7}" y="${Y + C - 7}" width="5" height="5" pointer-events="none"/>`
    }
  }
  const wl = [0, 2, 4].map(r => `<text class="hm-w" x="${GX - 8}" y="${GY + r * ST + 14}">${WEEK[(r + 1) % 7]}</text>`).join('')
  return `<div class="hmwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="hmsvg" xmlns="http://www.w3.org/2000/svg">${months}${wl}${cells}</svg></div>`
}
function heatLegend() {
  return `<div class="hmlegend"><span>少</span><i class="g1"></i><i class="g2"></i><i class="g3"></i><i class="g4"></i><span>多</span>
    <i class="g0"></i><span>记了没升</span><i class="none"></i><span>没记录</span><i class="sdot"></i><span>有计时</span></div>`
}

function heatPanel(c) {
  const days = dayStats(c)
  const A = analyze(days)
  if (!A.keys.length) {
    return `<section class="panel"><div class="panel-t">升级热力图</div>
      <div class="empty">还没有记录。去「计划」里记一笔，这里就会开始长格子。</div></section>`
  }
  const sel = UI.hday && days[UI.hday] ? UI.hday : null
  const sx = sel ? days[sel] : null
  const detail = sx
    ? `<div class="say"><b class="en">${sel}</b> 周${WEEK[parseD(sel).getDay()]} · ${sx.marks
        ? `升了 <b class="en">${pctLv(sx.gain)}</b> 一级，收在 Lv.${sx.level} · 记了 ${sx.marks} 笔`
        : '没记等级'}${sx.sess ? ` · 计时 ${sx.sess} 次共 ${fmtShort(sx.sessMs)}` : ''}</div>`
    : `<div class="say">点格子看那天的详情</div>`

  const w7 = sumGain(days, addDays(today(), -6), today())
  const w30 = sumGain(days, addDays(today(), -29), today())
  const up = lastLevelUp(c)
  const upN = up ? diffDays(up, today()) : null

  // 周几分布
  const wmax = Math.max(...A.wk, 1e-9)
  const order = [1, 2, 3, 4, 5, 6, 0]
  const topW = order.reduce((b, i) => A.wk[i] > A.wk[b] ? i : b, 1)
  const wkBars = order.map(i => `<div class="wkrow"><span>周${WEEK[i]}</span>
      <div class="rank-bar"><i style="width:${(A.wk[i] / wmax * 100).toFixed(0)}%"></i></div>
      <span class="en">${A.wk[i].toFixed(2)} 级</span></div>`).join('')

  const span = diffDays(A.keys[0], today()) + 1
  return `<section class="panel">
    <div class="panel-t">升级热力图</div>
    ${heatSVG(days, sel)}
    <div class="hmfoot">${detail}${heatLegend()}</div>

    <div class="stats four">
      <div class="stat hero"><div class="k">最近 7 天升了</div><div class="v en">${sumLv(w7).replace(/ (一级|级)$/, '')}<small> ${w7 >= 1 ? '级' : '一级'}</small></div><div class="n">30 天共 ${sumLv(w30)}</div></div>
      <div class="stat"><div class="k">连续练级</div><div class="v en">${A.streak}<small> 天</small></div><div class="n">最长 ${A.longest} 天${A.longestEnd ? '（到 ' + mmdd(A.longestEnd) + '）' : ''}</div></div>
      <div class="stat"><div class="k">上次升级</div><div class="v">${upN === null ? '—' : upN === 0 ? '今天' : upN + '<small> 天前</small>'}</div><div class="n">${up ? up : '还没记到过'}</div></div>
      <div class="stat"><div class="k">最猛的一天</div><div class="v en">${A.best && A.best.gain > 0 ? pctLv(A.best.gain) : '—'}</div><div class="n">${A.best && A.best.gain > 0 ? A.best.d + ' 周' + WEEK[parseD(A.best.d).getDay()] : '还没有'}</div></div>
    </div>

    <div class="plan-k" style="margin-top:14px">周几打得多<span class="plan-k-sub">按周几把升的级数加起来 · 最多的是周${WEEK[topW]}</span></div>
    <div class="wk">${wkBars}</div>

    <div class="hint" style="margin-top:10px">
      ${A.keys.length} 天有记录，跨 ${span} 天，一共升了 <b class="en">${A.total.toFixed(2)}</b> 级${A.gap ? ` · 最长空窗 <b class="en">${A.gap.n}</b> 天（${mmdd(A.gap.from)} → ${mmdd(A.gap.to)}）` : ''}${A.sinceLast > 1 ? ` · 已经 ${A.sinceLast} 天没练了` : ''}。<br>
      隔几天才记一次的话，中间打的会都算在记的那一天。
    </div>
  </section>`
}

function goalsPanel(c) {
  const list = (c.goals || []).slice().reverse()
  const cur = c.goalOn ? currentOf(c) : null
  if (!list.length && !cur) return ''
  const row = (g, live) => {
    const end = live ? today() : g.endDate
    const endLv = live ? cur.level : g.endLevel
    const endExp = live ? cur.exp : g.endExp
    const days = Math.max(1, diffDays(g.startDate, end))
    const got = Math.max(0, levelFloat(endLv, endExp) - levelFloat(g.startLevel, g.startExp))
    let tag, extra = ''
    if (live) tag = '<span class="gtag on">进行中</span>'
    else if (g.how === '达成') {
      tag = '<span class="gtag done">达成</span>'
      const early = diffDays(end, g.targetDate)
      extra = early > 0 ? ` · 提前 ${early} 天` : early < 0 ? ` · 晚了 ${-early} 天` : ' · 正好当天'
    } else tag = '<span class="gtag">结束</span>'
    return `<div class="logline">
      ${tag}
      <span class="en glv">Lv.${g.startLevel}→${g.targetLevel}</span>
      <span class="hint">${mmdd(g.startDate)} → ${live ? '今天' : mmdd(end)} · ${days} 天 · 平均每天 ${pctLv(got / days)}${extra}</span>
    </div>`
  }
  const rows = (cur ? row(c, true) : '') + list.map(g => row(g, false)).join('')
  const n = list.filter(g => g.how === '达成').length
  return `<section class="panel"><div class="panel-t">目标历史<span class="sub">达成 ${n} 次</span></div>
    <div class="logs">${rows}</div></section>`
}

function marksPanel(c) {
  const ms = sortedMarks(c)
  if (!ms.length) return ''
  const rows = ms.map((m, i) => {
    const p = ms[i - 1]
    let gain = ''
    if (p) {
      const g = expBetween(p.level, p.exp, 200) - expBetween(m.level, m.exp, 200)
      if (g > 0) gain = `+${fmt(g)}`
      else if (g < 0) gain = `<span class="neg">−${fmt(-g)}</span>`
    }
    const capp = expAt(m.level)
    return `<div class="logline">
      <span class="d en">${m.d.slice(0, 4) === today().slice(0, 4) ? mmdd(m.d) : m.d}${m.at ? ' ' + m.at.slice(11) : ''}</span>
      <span class="en">Lv.${m.level}</span>
      <span class="hint">${capp > 0 ? (m.exp / capp * 100).toFixed(2) + '%' : ''}</span>
      <span class="g en">${gain}</span>
      <button class="btn tiny" data-delmark="${m.id}">删</button>
    </div>`
  }).reverse().join('')
  return `<section class="panel"><div class="panel-t">每一笔<span class="sub">${ms.length} 笔</span></div><div class="logs">${rows}</div></section>`
}

function tablePanel(c, k) {
  if (k.finished) return ''
  let rows = '', cum = 0
  const curLF = levelFloat(k.cur.level, k.cur.exp)
  for (let l = k.cur.level; l < c.targetLevel; l++) {
    const need = l === k.cur.level ? Math.max(0, expAt(l) - k.cur.exp) : expAt(l)
    cum += need
    // 到 l+1 级要升多少级 ÷ 每天升几级 = 还要几天
    const eta = k.lvPerDay > 0 ? addDays(today(), Math.ceil((l + 1 - curLF) / k.lvPerDay)) : '—'
    rows += `<tr class="${l === k.cur.level ? 'mark' : ''}">
      <td class="lv">Lv.${l} → ${l + 1}</td>
      <td class="en">${full(need)}</td>
      <td class="en">${fmt(cum)}</td>
      <td class="en">${eta}</td>
    </tr>`
  }
  return `<section class="panel">
    <div class="panel-t">升级明细<span class="sub">按每天升 ${(k.lvPerDay * 100).toFixed(1)}% 一级推算</span></div>
    <details class="more" id="tbl" ${UI.showTable ? 'open' : ''}>
      <summary>展开每一级需要多少经验 / 预计哪天到</summary>
      <div class="tablewrap" style="margin-top:8px"><table>
        <thead><tr><th>等级</th><th>所需经验</th><th>累计</th><th>预计达成</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </details>
  </section>`
}

// 一个角色都没有、但本机有备份时，给个找回入口
function recoverBanner() {
  if (S.chars && S.chars.length) return ''
  const list = readBackups().filter(b => b.chars > 0)
  if (!list.length) return ''
  const rows = list.map((b, i) => `<div class="logline">
      <span class="d en">${b.at.slice(0, 16).replace('T', ' ')}</span>
      <span>${b.chars} 个角色</span>
      <span class="hint">${esc(b.reason || '')}</span>
      <button class="btn tiny" data-restore="${i}" style="margin-left:auto">恢复这份</button>
    </div>`).join('')
  return `<section class="panel" style="box-shadow:0 0 0 3px var(--red),0 6px 0 3px rgba(58,42,30,.35)">
    <div class="panel-t" style="color:var(--red)">本机还留着备份</div>
    <div class="hint" style="margin-bottom:8px">现在一个角色都没有，但这台机器上存着之前的快照。是同步出岔子的话，从这里找回来。</div>
    <div class="logs">${rows}</div>
  </section>`
}

function welcomeView() {
  const picks = SPRITE_KEYS.map((key, i) =>
    `<div class="pick ${i === 0 ? 'on' : ''}" data-nsprite="${key}" title="${SPRITES[key].label}">${spriteSVG(key)}</div>`).join('')
  const opts = []
  for (let l = 2; l <= 200; l++) opts.push(`<option value="${l}" ${l === 120 ? 'selected' : ''}>Lv.${l}</option>`)
  return `<section class="panel">
    <div class="panel-t">新建角色</div>
    <div class="row">
      <div class="field"><label>名字</label><input type="text" id="n-name" placeholder="角色名"></div>
      <div class="field"><label>职业（可空）</label><input type="text" id="n-job" placeholder="比如 弓箭手"></div>
    </div>
    <div class="field" style="margin-top:10px"><label>头像</label><div class="picks">${picks}</div></div>
    <div class="sep"></div>
    <div class="row">
      <div class="field" style="flex:0 0 110px"><label>当前等级</label><input type="text" inputmode="numeric" class="numin" id="n-lv" value="30"></div>
      <div class="field" style="flex:0 0 130px"><label>本级经验 %</label><input type="text" inputmode="numeric" class="numin pctin" id="n-exp" value="0.00"></div>
      <div class="field"><label>目标等级</label><select id="n-tlv">${opts.join('')}</select></div>
      <div class="field"><label>目标日期</label><input type="date" id="n-tdate" value="${addDays(today(), 60)}"></div>
    </div>
    <label class="chk"><input type="checkbox" id="n-nogoal"> 先不订目标，只记录（以后随时能订）</label>
    <div class="row" style="margin-top:12px">
      <button class="btn primary" id="n-create">创建角色</button>
      ${S.chars.length ? '<button class="btn ghost" id="n-cancel">取消</button>' : ''}
    </div>
    <div class="hint" style="margin-top:10px">经验表用的是国服怀旧服（CMS079）的数值。每个角色一套独立计划，数据自动同步到云端，换电脑打开同一个网址就能看到。</div>
  </section>`
}

/* ───────────────── 交互 ───────────────── */
let newSprite = SPRITE_KEYS[0]
let creating = false
let managing = false

document.addEventListener('click', e => {
  const t = e.target
  const pick = t.closest('[data-pick]')
  if (pick) { S.activeId = pick.dataset.pick; creating = false; save(); render(); return }

  const tb = t.closest('[data-tab]')
  if (tb) {
    UI.tab = tb.dataset.tab
    localStorage.setItem('mls_tab', UI.tab)
    render()
    return
  }

  const mv = t.closest('[data-move]')
  if (mv) {
    const i = S.chars.findIndex(x => x.id === mv.dataset.move)
    const j = i + Number(mv.dataset.dir)
    if (i < 0 || j < 0 || j >= S.chars.length) return
    const [m] = S.chars.splice(i, 1)
    S.chars.splice(j, 0, m)
    save(); render()
    return
  }

  if (t.id === 'manage-on') { managing = true; render(); return }
  if (t.id === 'manage-off') { managing = false; render(); return }

  const dc = t.closest('[data-del]')
  if (dc) {
    const c = S.chars.find(x => x.id === dc.dataset.del)
    if (!c) return
    if (!confirm(`删除角色「${c.name}」？ta 的计划、打卡和 ${(c.sessions || []).length} 次练级记录都会一起没掉，不能撤销。`)) return
    S.chars = S.chars.filter(x => x.id !== c.id)
    if (S.activeId === c.id) S.activeId = S.chars[0]?.id || null
    if (!S.chars.length) managing = false
    save(); render(); return
  }

  if (t.closest('[data-new]')) { creating = true; managing = false; newSprite = SPRITE_KEYS[0]; app().innerHTML = welcomeView(); return }
  if (t.id === 'n-cancel') { creating = false; render(); return }

  const ns = t.closest('[data-nsprite]')
  if (ns) {
    newSprite = ns.dataset.nsprite
    document.querySelectorAll('[data-nsprite]').forEach(el => el.classList.toggle('on', el === ns))
    return
  }

  const sp = t.closest('[data-sprite]')
  if (sp) { const c = activeChar(); c.sprite = sp.dataset.sprite; save(); render(); return }

  const unit = t.closest('[data-unit]')
  if (unit) { UI.expUnit = unit.dataset.unit; localStorage.setItem('mls_unit', UI.expUnit); render(); return }

  if (t.id === 'bf-cast') return buffCast(0)
  if (t.id === 'bf-cast-ago') return buffCast(Number(document.getElementById('bf-ago').value) || 0)
  if (t.id === 'bf-stop') return buffStop()
  if (t.id === 'bf-snd') return buffMute()
  if (t.id === 'bf-set') { UI.buffSet = !UI.buffSet; render(); return }
  // 先借这次点击把音频打开：小窗里的点击不一定能替主页面解锁声音
  if (t.id === 'bf-mini') { buffAudio().then(buffSchedule); return buffOpenMini() }
  if (t.id === 'bf-save') return buffSave()
  if (t.id === 'tm-start') return tmStart()
  if (t.id === 'tm-mark') return tmMark()
  if (t.id === 'tm-undo') return tmUndo()
  if (t.id === 'tm-pause') return tmPause()
  if (t.id === 'tm-resume') return tmResume()
  if (t.id === 'tm-stop') return tmStop()

  const ds = t.closest('[data-delsess]')
  if (ds) {
    e.preventDefault()
    const c = activeChar()
    if (confirm('删掉这条练级记录？')) { c.sessions = c.sessions.filter(x => x.id !== ds.dataset.delsess); save(); render() }
    return
  }

  const rb = t.closest('[data-restore]')
  if (rb) {
    const b = readBackups().filter(x => x.chars > 0)[+rb.dataset.restore]
    if (!b) return
    if (!confirm(`用 ${b.at.slice(0, 16).replace('T', ' ')} 那份备份（${b.chars} 个角色）覆盖当前数据？`)) return
    S = Object.assign({ chars: [], activeId: null }, JSON.parse(b.body))
    migrateAll()
    S.updated_at = new Date().toISOString()
    localStorage.setItem(LS, JSON.stringify(S))
    saveToCloud(S)
    render()
    return
  }

  if (t.id === 'n-create') return createChar()
  if (t.id === 'btn-log') return addMark()
  if (t.id === 'btn-goal-new') return startGoal()
  if (t.id === 'btn-goal-end') return endGoal()
  if (t.id === 'btn-target') return updateTarget()
  if (t.id === 'btn-name') return updateName()
  if (t.id === 'btn-start') return resetStart()
  if (t.id === 'btn-del') return delChar()

  const dm = t.closest('[data-delmark]')
  if (dm) {
    const c = activeChar()
    const m = (c.marks || []).find(x => x.id === dm.dataset.delmark)
    if (!m) return
    if (!confirm(`删掉 ${m.d}${m.at ? ' ' + m.at.slice(11) : ''} 那一笔（Lv.${m.level}）？`)) return
    c.marks = c.marks.filter(x => x.id !== m.id)
    syncLogs(c)
    save(); render(); return
  }

  // 热力图点格子：看那天的详情，再点一次取消
  const hd = t.closest('[data-hday]')
  if (hd) { UI.hday = UI.hday === hd.dataset.hday ? null : hd.dataset.hday; render(); return }
})

document.addEventListener('change', e => {
  const rn = e.target.closest ? e.target.closest('[data-rename]') : null
  if (rn) {
    const c = S.chars.find(x => x.id === rn.dataset.rename)
    const v = rn.value.trim()
    if (c && v && v !== c.name) { c.name = v; save() }
    else if (c) rn.value = c.name
    return
  }
  if (e.target.id === 'mp-cont') {
    // 换大陆 → 回到在这块大陆上次选的地区（来回切通天塔和金银岛不用每次重找），没有就第一个
    const cont = e.target.value
    const last = lastRegionOf()[cont]
    const g = MAPS.find(g => g.cont === cont && g.region === last) || MAPS.find(g => g.cont === cont)
    if (g) { UI.region = g.region; UI.map = '' }
    localStorage.setItem('mls_region', UI.region); localStorage.setItem('mls_map', '')
    render()
  }
  if (e.target.id === 'mp-region') {
    UI.region = e.target.value; UI.map = ''
    localStorage.setItem('mls_region', UI.region); localStorage.setItem('mls_map', '')
    const g = MAPS.find(g => g.region === UI.region)
    if (g) {
      const o = lastRegionOf(); o[g.cont] = g.region
      try { localStorage.setItem('mls_cont_region', JSON.stringify(o)) } catch (_) { /* 存不了就算了 */ }
    }
    render()
  }
  if (e.target.id === 'mp-map') {
    UI.map = e.target.value
    localStorage.setItem('mls_map', UI.map)
  }
  if (e.target.id === 'mp-mult') {
    UI.mult = Number(e.target.value) || 1
    localStorage.setItem('mls_mult', String(UI.mult))
  }
})

document.addEventListener('toggle', e => {
  if (e.target.id === 'tbl') { UI.showTable = e.target.open; localStorage.setItem('mls_tbl', UI.showTable ? '1' : '0') }
}, true)

function readExpInput(lv, raw) {
  const cap = expAt(lv)
  let v = Number(raw)
  if (!isFinite(v) || v < 0) v = 0
  if (UI.expUnit === 'pct') v = cap * clamp(v, 0, 100) / 100
  return clamp(Math.round(v), 0, Math.max(0, cap - 1))
}

function createChar() {
  const name = (document.getElementById('n-name').value || '').trim() || '新角色'
  const job = (document.getElementById('n-job').value || '').trim()
  const lv = clamp(parseInt(document.getElementById('n-lv').value, 10) || 1, 1, 199)
  const cap = expAt(lv)
  const pctv = clamp(Number(document.getElementById('n-exp').value) || 0, 0, 100)
  const exp = clamp(Math.round(cap * pctv / 100), 0, Math.max(0, cap - 1))
  let tlv = parseInt(document.getElementById('n-tlv').value, 10) || 200
  tlv = clamp(tlv, lv + 1, 200)
  let tdate = document.getElementById('n-tdate').value || addDays(today(), 60)
  if (diffDays(today(), tdate) < 1) tdate = addDays(today(), 1)
  const noGoal = document.getElementById('n-nogoal').checked
  const c = {
    id: 'c' + Date.now().toString(36),
    name, job, sprite: newSprite,
    startDate: today(), startLevel: lv, startExp: exp,
    targetLevel: tlv, targetDate: tdate,
    goalOn: !noGoal, goals: [], marks: [],
    timer: null, sessions: [],
    createdAt: new Date().toISOString()
  }
  pushMark(c, lv, exp)
  S.chars.push(c)
  S.activeId = c.id
  creating = false
  save(); render()
}

function addMark() {
  const c = activeChar()
  const lv = clamp(parseInt(document.getElementById('in-lv').value, 10) || 1, 1, 200)
  const exp = readExpInput(lv, document.getElementById('in-exp').value)
  const done = pushMark(c, lv, exp)
  save(); render()
  if (done) celebrate(c)
}

// 目标达成那一下给个反馈 —— 页面已经切成平日记录了，顶上有归档的那条
function celebrate(c) {
  const g = c.goals[c.goals.length - 1]
  setTimeout(() => alert(`🎉 ${c.name} 达成目标 Lv.${g.targetLevel}！\n\n` +
    `${g.startDate} → ${g.endDate}，用了 ${Math.max(1, diffDays(g.startDate, g.endDate))} 天。\n` +
    `已经归档进「记录」里的目标历史，现在回到平日记录。`), 50)
}

function startGoal() {
  const c = activeChar()
  const cur = currentOf(c)
  if (cur.level >= 200) return
  const tlv = clamp(parseInt(document.getElementById('g-tlv').value, 10) || 200, cur.level + 1, 200)
  let tdate = document.getElementById('g-tdate').value || addDays(today(), 30)
  if (diffDays(today(), tdate) < 1) tdate = addDays(today(), 1)
  // 新目标的起点就是现在的位置
  c.startDate = today(); c.startLevel = cur.level; c.startExp = cur.exp
  c.targetLevel = tlv; c.targetDate = tdate
  c.goalOn = true
  save(); render()
}

function endGoal() {
  const c = activeChar()
  if (!c.goalOn) return
  if (!confirm(`结束「Lv.${c.startLevel} → ${c.targetLevel}」这个目标？\n\n会归档进「记录」里的目标历史，之后变成平日记录，随时能订新目标。记录都保留。`)) return
  archiveGoal(c, '手动结束')
  save(); render()
}

function updateTarget() {
  const c = activeChar()
  const cur = currentOf(c)
  c.targetLevel = clamp(parseInt(document.getElementById('in-tlv').value, 10) || 200, Math.min(200, cur.level + 1), 200)
  const d = document.getElementById('in-tdate').value
  if (d) c.targetDate = diffDays(today(), d) < 0 ? today() : d
  save(); render()
}

function updateName() {
  const c = activeChar()
  c.name = (document.getElementById('in-name').value || '').trim() || c.name
  c.job = (document.getElementById('in-job').value || '').trim()
  save(); render()
}

function resetStart() {
  const c = activeChar()
  const lv = clamp(parseInt(document.getElementById('in-slv').value, 10) || 1, 1, 200)
  const cap = expAt(lv)
  const pct = clamp(Number(document.getElementById('in-spct').value) || 0, 0, 100)
  c.startLevel = lv
  c.startExp = clamp(Math.round(cap * pct / 100), 0, Math.max(0, cap - 1))
  const d = document.getElementById('in-sdate').value
  if (d) c.startDate = d
  if (c.targetLevel <= c.startLevel) c.targetLevel = Math.min(200, c.startLevel + 1)
  save(); render()
}

function delChar() {
  const c = activeChar()
  if (!confirm(`删除角色「${c.name}」和 ta 的全部计划？这个操作不能撤销。`)) return
  S.chars = S.chars.filter(x => x.id !== c.id)
  S.activeId = S.chars[0]?.id || null
  save(); render()
}

/* ───────────────── 练级计时器 ─────────────────
   计时只累计「跑着」的时间，暂停期间不算。
   打点存的是 { ms: 当时的有效计时, level, exp }，两点之间算一段效率。 */

function regionOf(name) {
  const g = MAPS.find(g => g.maps.some(m => m.n === name))
  return g ? g.region : ''
}
// 三级：大陆 → 地区 → 地图。大陆不单独存，由当前地区反推，免得两者对不上
const CONTS = [...new Set(MAPS.map(g => g.cont))]
// 每块大陆上次选的地区 { 大陆: 地区 }，纯本机的使用习惯，不上云
function lastRegionOf() {
  try { return JSON.parse(localStorage.getItem('mls_cont_region') || '{}') || {} } catch (_) { return {} }
}
function mapPicker() {
  const reg = MAPS.find(g => g.region === UI.region) || MAPS[0]
  const contOpts = CONTS.map(c => `<option value="${c}" ${c === reg.cont ? 'selected' : ''}>${c}</option>`).join('')
  const regOpts = MAPS.filter(g => g.cont === reg.cont)
    .map(g => `<option value="${g.region}" ${g.region === reg.region ? 'selected' : ''}>${g.region}</option>`).join('')
  const mapOpts = ['<option value="">（不填）</option>']
    .concat(reg.maps.map(m => `<option value="${m.n}" ${m.n === UI.map ? 'selected' : ''}>${esc(m.n)}</option>`)).join('')
  // 经验卡/活动的倍率。开卡和裸练的数据不能混在一起算，所以它和地图一样是段的属性
  const multOpts = MULTS.map(m =>
    `<option value="${m}" ${m === UI.mult ? 'selected' : ''}>${multText(m)}</option>`).join('')
  return `<div class="field" style="flex:1 1 110px"><label>大陆</label>
      <select id="mp-cont">${contOpts}</select></div>
    <div class="field" style="flex:1 1 120px"><label>地区</label>
      <select id="mp-region">${regOpts}</select></div>
    <div class="field" style="flex:1 1 160px"><label>现在在哪练</label>
      <select id="mp-map">${mapOpts}</select></div>
    <div class="field" style="flex:0 0 100px"><label>经验倍率</label>
      <select id="mp-mult">${multOpts}</select></div>`
}

const MULTS = [1, 1.5, 2, 3, 4]
const multText = m => m === 1 ? '裸练 1x' : m + 'x'

const totalTo200 = (lv, exp) => expBetween(lv, exp, 200)
const gainBetween = (a, b) => totalTo200(a.level, a.exp) - totalTo200(b.level, b.exp)

function timerMs(t) {
  if (!t) return 0
  return t.accumMs + (t.state === 'running' ? Date.now() - t.startedAt : 0)
}

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60
  return `${pad(h)}:${pad(m)}:${pad(ss)}`
}
function fmtShort(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60)
  return h > 0 ? `${h}:${pad(m)}` : `${m}分`
}
// 经验/小时；带符号（怀旧服死亡会掉经验，允许为负）
function rateOf(gain, ms) { return ms > 0 ? gain / (ms / 3600000) : 0 }
const signed = n => (n < 0 ? '−' : '') + fmt(Math.abs(n))

// 坐标轴刻度：按整个量程挑精度，免得小范围下几个刻度都显示成同一个数
function fmtAxis(v, span) {
  if (span >= 1e8) return (v / 1e8).toFixed(2) + '亿'
  if (span >= 1e6) return Math.round(v / 1e4) + '万'
  if (span >= 1e4) return (v / 1e4).toFixed(1) + '万'
  if (span >= 100) return Math.round(v).toLocaleString('en-US')
  return String(Math.round(v * 10) / 10)
}

function segmentsOf(points) {
  const segs = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].ms - points[i - 1].ms
    const gain = gainBetween(points[i - 1], points[i])
    // 时长为 0 的段（暂停期间补记的读数）并进上一段。
    // 不并的话 rateOf 会返回 0，那点经验在效率图里就凭空消失了
    if (dt <= 0) {
      const prev = segs[segs.length - 1]
      if (prev) {
        prev.gain += gain
        prev.rate = rateOf(prev.gain, prev.dt)
        prev.level = points[i].level
      }
      continue
    }
    segs.push({ dt, gain, rate: rateOf(gain, dt), at: points[i].ms,
                fromLevel: points[i - 1].level, level: points[i].level,
                map: points[i - 1].map || '', mult: points[i - 1].mult || 1 })
  }
  return segs
}

function chartHTML(points) {
  const segs = segmentsOf(points)
  if (!segs.length) return '<div class="empty">至少要两个打点才画得出图。</div>'

  const W = 680, H = 310, L = 86, R = 22, T = 46, B = 62
  const iw = W - L - R, ih = H - T - B
  const t0 = points[0].ms
  const tSpan = Math.max(1, points[points.length - 1].ms - t0)

  // Y 轴按数据自己的范围走，上下各留 12% —— 不硬从 0 起，不然起伏全挤成一条线
  let lo = Math.min(...segs.map(s => s.rate))
  let hi = Math.max(...segs.map(s => s.rate))
  if (hi === lo) { const d = Math.abs(hi) * 0.3 || 1; lo -= d; hi += d }
  const pad = (hi - lo) * 0.12
  lo -= pad; hi += pad

  const px = ms => L + (ms - t0) / tSpan * iw
  const py = v => T + (hi - v) / (hi - lo) * ih

  // 横网格 + Y 刻度
  let grid = ''
  const TICKS = 4
  for (let i = 0; i <= TICKS; i++) {
    const v = lo + (hi - lo) * (1 - i / TICKS)
    const y = py(v)
    grid += `<line class="cg" x1="${L}" y1="${y.toFixed(1)}" x2="${W - R}" y2="${y.toFixed(1)}"/>`
    grid += `<text class="cyl" x="${L - 10}" y="${(y + 6).toFixed(1)}">${fmtAxis(v, hi - lo)}</text>`
  }
  if (lo < 0 && hi > 0) {
    grid += `<line class="czero" x1="${L}" y1="${py(0).toFixed(1)}" x2="${W - R}" y2="${py(0).toFixed(1)}"/>`
  }

  // 折线：补一个起点，让线从左边缘开始
  const nodes = [{ ms: t0, rate: segs[0].rate, lead: true }]
    .concat(segs.map(s => ({ ms: s.at, rate: s.rate, seg: s })))
  const line = nodes.map(n => `${px(n.ms).toFixed(1)},${py(n.rate).toFixed(1)}`).join(' ')

  // 贴边的文字改对齐方式，居中会被画布裁掉。
  // 必须用内联 style：SVG 里 CSS 的 text-anchor 会盖掉同名的呈现属性
  const edgeAnchor = x =>
    x < L + 30 ? 'style="text-anchor:start"' : x > W - R - 30 ? 'style="text-anchor:end"' : ''

  // 数据点：像素风用小方块，不用圆
  const showAll = segs.length <= 8
  const maxR = Math.max(...segs.map(s => s.rate))
  const minR = Math.min(...segs.map(s => s.rate))
  let dots = ''
  segs.forEach((sg, i) => {
    const x = px(sg.at), y = py(sg.rate)
    const label = showAll || sg.rate === maxR || sg.rate === minR || i === segs.length - 1
    dots += `<rect class="cdot" x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10">
      <title>${esc(sg.map || '没填地图')} · ${fmtShort(sg.dt)} 内 ${signed(sg.gain)} 经验</title></rect>`
    if (label) {
      const ly = Math.max(T - 6, y - 16)   // 别顶出画布
      dots += `<text class="cvl" ${edgeAnchor(x)} x="${x.toFixed(1)}" y="${ly.toFixed(1)}">${signed(sg.rate)}</text>`
    }
  })

  // X 刻度：最多 6 个，均匀取
  let xax = ''
  const step = Math.max(1, Math.ceil(segs.length / 6))
  segs.forEach((sg, i) => {
    if (i % step !== 0 && i !== segs.length - 1) return
    const x = px(sg.at)
    xax += `<line class="cg" x1="${x.toFixed(1)}" y1="${T + ih}" x2="${x.toFixed(1)}" y2="${T + ih + 6}"/>`
    xax += `<text class="cxl" ${edgeAnchor(x)} x="${x.toFixed(1)}" y="${T + ih + 24}">${fmtDur(sg.at).slice(0, 5)}</text>`
  })
  // 地图名只在换图的时候标一次
  let maps = ''
  let prev = null
  segs.forEach(sg => {
    if (!sg.map || sg.map === prev) return
    prev = sg.map
    const mx = px(sg.at)
    maps += `<text class="cml" ${edgeAnchor(mx)} x="${mx.toFixed(1)}" y="${T + ih + 44}">${esc(sg.map)}</text>`
  })

  const avg = rateOf(segs.reduce((a, s) => a + s.gain, 0), segs.reduce((a, s) => a + s.dt, 0))

  return `<div class="chart">
    <svg viewBox="0 0 ${W} ${H}" class="cchart" xmlns="http://www.w3.org/2000/svg">
      ${grid}
      <line class="caxis" x1="${L}" y1="${T}" x2="${L}" y2="${T + ih}"/>
      <line class="caxis" x1="${L}" y1="${T + ih}" x2="${W - R}" y2="${T + ih}"/>
      <polyline class="cline" points="${line}"/>
      ${dots}${xax}${maps}
      <text class="cyt" x="${L - 76}" y="20">经验/小时</text>
    </svg>
  </div>
  <div class="hint">纵轴是那一段的经验/小时，横轴是计时走了多久（按真实间隔画，不是等距）。
    最高 ${signed(maxR)}/h · 最低 ${signed(minR)}/h · 全程平均 ${signed(avg)}/h。</div>`
}

function timerPanel(c) {
  const t = c.timer
  const state = t ? t.state : 'idle'
  const ms = timerMs(t)
  const pts = t ? t.points : []
  const gain = pts.length >= 2 ? gainBetween(pts[0], pts[pts.length - 1]) : 0
  const rate = rateOf(gain, ms)

  // 输入框预填：有计时就用最后一个打点，没有就用角色当前进度
  const seed = pts.length ? pts[pts.length - 1] : currentOf(c)
  const cap = expAt(seed.level)
  const unitPct = UI.expUnit === 'pct'
  const seedVal = unitPct ? (cap > 0 ? (seed.exp / cap * 100).toFixed(2) : '0') : seed.exp

  const label = { idle: '没在计时', running: '计时中', paused: '已暂停' }[state]
  const btns = state === 'idle'
    ? `<button class="btn primary" id="tm-start">开始</button>`
    : state === 'running'
      ? `<button class="btn" id="tm-mark">记一笔</button>
         ${pts.length > 1 ? '<button class="btn ghost" id="tm-undo">撤销</button>' : ''}
         <button class="btn" id="tm-pause">暂停</button>
         <button class="btn danger" id="tm-stop">终止</button>`
      : `<button class="btn primary" id="tm-resume">继续</button>
         <button class="btn" id="tm-mark">记一笔</button>
         ${pts.length > 1 ? '<button class="btn ghost" id="tm-undo">撤销</button>' : ''}
         <button class="btn danger" id="tm-stop">终止</button>`

  const live = pts.length >= 2
    ? `<div class="stats" style="margin-top:12px">
         <div class="stat hero"><div class="k">效率</div><div class="v">${signed(rate)}<small style="font-size:18px">/小时</small></div><div class="n">${pts.length} 个打点</div></div>
         <div class="stat"><div class="k">这段共打</div><div class="v">${signed(gain)}</div><div class="n">${Math.round(gain).toLocaleString('en-US')}</div></div>
       </div>
       ${chartHTML(pts)}`
    : (state === 'idle'
      ? `<div class="hint" style="margin-top:8px">填好当前等级和经验，按「开始」。中途随时「记一笔」，暂停也会自动记一笔。开始后按 <b>空格</b> 暂停 / 继续。暂停中「记一笔」是修正暂停那一刻的读数，不会多出一段。</div>`
      : `<div class="hint" style="margin-top:8px">已经记了起点。再「记一笔」就能算出效率了。按 <b>空格</b> 暂停 / 继续。</div>`)

  return `<section class="panel">
    <div class="panel-t">练级计时器${pts.length ? `<span class="sub">${pts.length} 个打点</span>` : ''}</div>
    <div class="clock ${state}">
      <i class="dot" aria-hidden="true"></i>
      <span id="tm-time" class="en">${fmtDur(ms)}</span>
      <em>${state === 'running' ? '计时中' : state === 'paused' ? '暂停中 · 空格继续' : '没在计时'}</em>
    </div>
    ${buffHTML()}
    <div class="row" style="margin-top:12px">
      <div class="field" style="flex:0 0 110px"><label>当前等级</label>
        <input type="text" inputmode="numeric" class="numin" id="tm-lv" value="${seed.level}"></div>
      <div class="field" style="flex:1 1 150px"><label>本级经验${unitPct ? '（%）' : '（点）'}</label>
        <input type="text" inputmode="numeric" class="numin ${unitPct ? 'pctin' : ''}" id="tm-exp" value="${seedVal}"></div>
    </div>
    <div class="row" style="margin-top:8px">
      ${mapPicker()}
    </div>
    <div class="tmbtns">${btns}</div>
    ${live}
  </section>`
}

// 效率记录的主键是「等级 + 地图」：同一级在同一张图上打的所有段，合起来算
function levelMapStats(c) {
  const acc = {}
  for (const s of c.sessions || []) {
    for (const sg of segmentsOf(s.points)) {
      if (sg.dt <= 0) continue
      const map = sg.map || '（没填地图）'
      const mult = sg.mult || 1
      const key = sg.fromLevel + '\u0000' + map + '\u0000' + mult
      const a = acc[key] || (acc[key] = { level: sg.fromLevel, map, mult, ms: 0, gain: 0, segs: 0 })
      a.ms += sg.dt; a.gain += sg.gain; a.segs++
    }
  }
  // 等级高的在上；同一级按经验收入多的在上
  return Object.values(acc)
    .map(a => ({ ...a, rate: rateOf(a.gain, a.ms) }))
    // 等级高的在上；同一级按「经验/小时」快的在上（倍率不参与排序）
    .sort((x, y) => y.level - x.level || y.rate - x.rate)
}

function statsPanel(c) {
  const rows = levelMapStats(c)
  if (!rows.length) {
    return `<section class="panel"><div class="panel-t">效率记录</div>
      <div class="empty">还没有练级记录。用计时器练一轮、按「终止」存档之后，这里就会按「等级 + 地图」汇总出来。</div></section>`
  }
  const max = Math.max(...rows.map(r => Math.abs(r.rate)), 1)
  const body = rows.map(r => `<tr>
      <td class="lv">Lv.${r.level}</td>
      <td style="text-align:left">${esc(r.map)}<div class="hint" style="font-size:13px">${esc(regionOf(r.map) || '—')}</div></td>
      <td>${r.mult > 1 ? `<span class="multtag">${r.mult}x</span>` : '<span class="hint">裸练</span>'}</td>
      <td><div class="rank-bar" style="min-width:60px"><i style="width:${Math.round(Math.abs(r.rate) / max * 100)}%"></i></div></td>
      <td class="en ${r.rate < 0 ? 'neg' : ''}">${signed(r.rate)}/h</td>
      <td class="en">${signed(r.gain)}</td>
      <td class="en">${fmtShort(r.ms)}</td>
    </tr>`).join('')
  return `<section class="panel">
    <div class="panel-t">效率记录<span class="sub">${rows.length} 个「等级 + 地图 + 倍率」组合</span></div>
    <div class="tablewrap"><table class="statstable">
      <thead><tr><th>等级</th><th style="text-align:left">地图</th><th>倍率</th><th>效率</th><th>经验/小时</th><th>累计经验</th><th>时长</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>
    <div class="hint" style="margin-top:8px">主键是「等级 + 地图 + 倍率」—— 开经验卡和裸练分开统计，不会混着拉平均。按时长加权。排序：等级从高到低，同一级按经验/小时从快到慢。</div>
  </section>`
}

function sessionsPanel(c) {
  const list = (c.sessions || []).slice().reverse()
  if (!list.length) return ''
  const best = list.reduce((a, b) => (b.rate > a.rate ? b : a), list[0])
  const rows = list.map(s => `<details class="more sess">
      <summary>
        <span class="en sess-lv">Lv.${s.points[0].level}${s.points[s.points.length - 1].level !== s.points[0].level ? '→' + s.points[s.points.length - 1].level : ''}</span>
        <span class="en">${s.startedAt.slice(5, 10)} ${s.startedAt.slice(11, 16)}</span>
        <span class="sess-r ${s.rate < 0 ? 'neg' : ''}">${signed(s.rate)}/h</span>
        <span class="hint">${fmtShort(s.ms)} · ${signed(s.gain)}${s.note ? ' · ' + esc(s.note) : ''}</span>
        <button class="btn tiny" data-delsess="${s.id}">删</button>
      </summary>
      <div style="margin-top:8px">${chartHTML(s.points)}</div>
    </details>`).join('')
  return `<section class="panel">
    <div class="panel-t">练级记录<span class="sub">最好 ${signed(best.rate)}/h</span></div>
    <div class="sesslist">${rows}</div>
  </section>`
}

/* ── 计时器动作 ── */
function readTimerInput() {
  const lv = clamp(parseInt(document.getElementById('tm-lv').value, 10) || 1, 1, 200)
  const sel = document.getElementById('mp-map')
  const ms = document.getElementById('mp-mult')
  return {
    level: lv,
    exp: readExpInput(lv, document.getElementById('tm-exp').value),
    map: sel ? sel.value : '',
    mult: ms ? Number(ms.value) || 1 : 1,
  }
}

function tmStart() {
  const c = activeChar()
  const p = readTimerInput()
  c.timer = { state: 'running', startedAt: Date.now(), accumMs: 0, points: [{ ms: 0, ...p, at: new Date().toISOString() }] }
  save(); render()
}
function tmMark(silent) {
  const c = activeChar()
  const t = c.timer; if (!t) return
  const p = readTimerInput()
  const now = timerMs(t)
  const last = t.points[t.points.length - 1]
  // 暂停中（或刚记完不到一秒）再记一笔，时间没走过，
  // 这应该是「修正上一笔的读数」而不是新增一笔 —— 新增会造出一个零时长的段
  if (last && now - last.ms < 1000) {
    Object.assign(last, p, { ms: now, at: new Date().toISOString() })
  } else {
    t.points.push({ ms: now, ...p, at: new Date().toISOString() })
  }
  if (!silent) { save(); render() }
}
// 撤销最后一个打点。起点那一笔撤不掉 —— 撤了整段计时就没有参照了
function tmUndo() {
  const c = activeChar()
  const t = c.timer
  if (!t || t.points.length < 2) return
  const last = t.points[t.points.length - 1]
  const prev = t.points[t.points.length - 2]
  const gain = gainBetween(prev, last)
  if (!confirm(`撤销最后一笔？\n\n` +
      `${fmtDur(last.ms)}  Lv.${last.level} · ${(expAt(last.level) > 0 ? last.exp / expAt(last.level) * 100 : 0).toFixed(2)}%` +
      `${last.map ? '  ' + last.map : ''}\n` +
      `这一段记的是 ${signed(gain)} 经验，撤掉之后回到上一笔。`)) return
  t.points.pop()
  save(); render()
}

function tmPause() {
  const c = activeChar(); const t = c.timer; if (!t || t.state !== 'running') return
  tmMark(true)
  t.accumMs = timerMs(t); t.state = 'paused'
  save(); render()
}
function tmResume() {
  const c = activeChar(); const t = c.timer; if (!t || t.state !== 'paused') return
  t.startedAt = Date.now(); t.state = 'running'
  save(); render()
}
function tmStop() {
  const c = activeChar(); const t = c.timer; if (!t) return
  if (t.state === 'running') tmMark(true)
  const ms = timerMs(t)
  const pts = t.points
  if (pts.length < 2) {
    if (!confirm('只有一个打点，算不出效率。直接丢掉这次计时？')) return
    c.timer = null; save(); render(); return
  }
  const gain = gainBetween(pts[0], pts[pts.length - 1])
  const mapNames = [...new Set(segmentsOf(pts).map(sg => sg.map).filter(Boolean))]
  const note = mapNames.length > 2 ? `${mapNames[0]} 等 ${mapNames.length} 张图` : mapNames.join(' / ')
  c.sessions = c.sessions || []
  c.sessions.push({
    id: 's' + Date.now().toString(36),
    startedAt: pts[0].at, endedAt: new Date().toISOString(),
    ms, gain, rate: rateOf(gain, ms), points: pts, note
  })
  // 顺手把最后一个打点记成一笔
  const last = pts[pts.length - 1]
  c.timer = null
  const done = pushMark(c, last.level, last.exp)
  save(); render()
  if (done) celebrate(c)
}

/* ───────────────── 增益技能倒计时 ─────────────────
   一个技能、一个 CD，按「放了」从现在开始倒数，到 0 自动进入下一轮。
   剩 40 / 30 / 20 / 10 秒各「嘀」一声，越近越急（金 → 橙 → 红闪），到 0 换一个提示音。

   声音**不靠 setInterval 去响**：浏览器窗口被游戏挡住或切到后台时，定时器会被放慢，
   严重时一分钟才跑一次，「剩 10 秒」会晚到甚至没了。所以「放了」那一刻就把接下来
   10 分钟的提示音全排进 Web Audio 的时间轴，由音频时钟准时播，和 JS 定时器无关。
   画面上的倒数照样用定时器刷 —— 看得见的时候它不会被放慢。

   状态存本机 localStorage `mls_buff`，不上云：这是此刻在游戏里的实时状态，换台机器没有意义。 */
const BUFF_KEY = 'mls_buff'
const BUFF_ALERTS = [40, 30, 20, 10]
const BUFF_AHEAD = 10 * 60000       // 提前排多远的声音。要比「后台定时器最慢一分钟一跑」长得多
function buffState() {
  let b = null
  try { b = JSON.parse(localStorage.getItem(BUFF_KEY) || 'null') } catch (_) { /* 读不到就当没设 */ }
  return Object.assign({ name: '增益', cd: 120, at: null, mute: false }, b || {})
}
function buffSaveState(b) {
  try { localStorage.setItem(BUFF_KEY, JSON.stringify(b)) } catch (_) { /* 存不了就只在这次页面里有效 */ }
}

// 这一轮还剩多少毫秒；第几轮（0 = 按「放了」之后的第一轮）
function buffNow(b, now = Date.now()) {
  const cd = b.cd * 1000
  const el = Math.max(0, now - b.at)
  return { left: cd - el % cd, round: Math.floor(el / cd), inRound: el % cd, cd }
}

/* ── 声音 ── */
const Buff = { ctx: null, nodes: [], until: 0 }
function buffAudio() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return Promise.resolve(null)
  if (!Buff.ctx) Buff.ctx = new AC()
  return Buff.ctx.state === 'running' ? Promise.resolve(Buff.ctx) : Buff.ctx.resume().then(() => Buff.ctx, () => null)
}
// 一声方波「嘀」—— 像素风就配 8-bit 的声音。音量压得很低，只是提醒
function buffTone(ctx, t, freq, dur, vol = 0.05) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'square'; o.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.005)
  g.gain.setValueAtTime(vol, t + dur - 0.015)
  g.gain.linearRampToValueAtTime(0, t + dur)
  o.connect(g); g.connect(ctx.destination)
  o.start(t); o.stop(t + dur + 0.01)
  Buff.nodes.push({ g, end: t + dur })
}
function buffSound(ctx, t, sec) {
  if (sec === 0) {                       // 到 0：三连音往上走，和前面的「嘀」一听就分得开
    buffTone(ctx, t, 784, 0.09); buffTone(ctx, t + 0.11, 988, 0.09); buffTone(ctx, t + 0.22, 1319, 0.16)
  } else if (sec === 10) {               // 最后 10 秒：两声，高一点
    buffTone(ctx, t, 988, 0.08); buffTone(ctx, t + 0.13, 988, 0.08)
  } else {                               // 40 / 30 / 20：一声
    buffTone(ctx, t, 659, 0.09)
  }
}
// 取消已经排好、还没播的声音：断开音量节点就静音了（不再调 stop()，有的浏览器重复 stop 会抛错）
function buffClearSounds() {
  for (const n of Buff.nodes) { try { n.g.disconnect() } catch (_) { /* 忽略 */ } }
  Buff.nodes = []; Buff.until = 0
}
// 把 [已排到的时刻, 现在 + 10 分钟] 之间的提示音排进音频时间轴。重复调用只补新的，不会重复排
function buffSchedule() {
  const b = buffState(), ctx = Buff.ctx
  if (!b.at || b.mute || !ctx || ctx.state !== 'running') return
  const now = Date.now(), horizon = now + BUFF_AHEAD
  const from = Math.max(now, Buff.until)
  if (horizon - from < 60000) return     // 剩下的还够一分钟以上，先不补
  const cd = b.cd * 1000
  Buff.nodes = Buff.nodes.filter(n => n.end > ctx.currentTime)   // 播完的丢掉，列表不会越攒越长
  for (let k = Math.max(0, Math.floor((from - b.at) / cd)); ; k++) {
    const end = b.at + (k + 1) * cd     // 第 k 轮结束 = 该放技能的时刻
    if (end - BUFF_ALERTS[0] * 1000 > horizon) break
    for (const sec of [...BUFF_ALERTS, 0]) {
      if (sec * 1000 >= cd) continue     // CD 本身不到 40 秒，就没有「剩 40 秒」
      const at = end - sec * 1000
      if (at <= from || at > horizon) continue
      buffSound(ctx, ctx.currentTime + (at - now) / 1000, sec)
    }
  }
  Buff.until = horizon
}

/* ── 动作 ── */
function buffCast(agoSec) {
  const b = buffState()
  b.at = Date.now() - clamp(Math.round(agoSec), 0, b.cd - 1) * 1000
  buffSaveState(b)
  buffClearSounds()
  // 「放了」是一次点击，借这次点击把音频打开（浏览器不允许没点过就出声）
  buffAudio().then(() => { buffSchedule(); buffPaint() })
  render()
}
function buffStop() {
  const b = buffState(); b.at = null; buffSaveState(b)
  buffClearSounds(); render()
}
function buffMute() {
  const b = buffState(); b.mute = !b.mute; buffSaveState(b)
  buffClearSounds()
  if (!b.mute) buffAudio().then(buffSchedule)
  render()
}
function buffSave() {
  const b = buffState()
  b.name = (document.getElementById('bf-name').value || '').trim() || '增益'
  const m = clamp(parseInt(document.getElementById('bf-m').value, 10) || 0, 0, 59)
  const sec = clamp(parseInt(document.getElementById('bf-s').value, 10) || 0, 0, 59)
  b.cd = Math.max(5, m * 60 + sec)
  buffSaveState(b)
  buffClearSounds(); buffAudio().then(buffSchedule)
  UI.buffSet = false
  render()
}

/* ── 画面 ── */
const fmtMS = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + pad(s % 60) }
// 剩 >40 秒平常；≤40 金；≤20 橙；≤10 红闪；刚进新一轮的头 3 秒绿色「该放了」
function buffLevel(b) {
  if (!b.at) return 'off'
  const n = buffNow(b)
  if (n.round > 0 && n.inRound < 3000) return 'now'
  const s = n.left / 1000
  return s <= 10 ? 'crit' : s <= 20 ? 'hot' : s <= 40 ? 'warn' : 'calm'
}
function buffHTML() {
  const b = buffState()
  const set = UI.buffSet || !localStorage.getItem(BUFF_KEY)   // 头一次用直接展开设置
  const n = b.at ? buffNow(b) : null
  const lv = buffLevel(b)
  const needTap = b.at && !b.mute && !(Buff.ctx && Buff.ctx.state === 'running')
  const row = `<div class="buff ${lv}" id="buff">
      <span class="buff-n">${esc(b.name)}<small class="en">${fmtMS(b.cd * 1000)}</small></span>
      <span class="buff-t en" id="buff-t">${n ? (lv === 'now' ? '该放了' : fmtMS(n.left)) : '—'}</span>
      <span class="buff-bar"><i id="buff-i" style="width:${n ? (n.left / n.cd * 100).toFixed(1) : 0}%"></i></span>
      <button class="btn tiny ${b.at ? '' : 'primary'}" id="bf-cast">放了</button>
      ${b.at ? '<button class="btn tiny" id="bf-stop">停</button>' : ''}
      <button class="btn tiny ghost" id="bf-snd" title="${b.mute ? '现在静音，点一下开声音' : '点一下静音'}">${b.mute ? '🔇' : '🔊'}</button>
      <button class="btn tiny ghost" id="bf-mini" title="开一个小窗口，看视频的时候也能看到倒计时">小窗</button>
      <button class="btn tiny ghost" id="bf-set">${set ? '收起' : '设置'}</button>
    </div>
    ${needTap ? '<div class="hint buff-tap">刷新过页面，浏览器要点一下才肯出声 —— 点页面任意地方就行</div>' : ''}`
  const form = set ? `<div class="buff-form">
      <div class="field" style="flex:1 1 120px"><label>技能名</label><input type="text" id="bf-name" value="${esc(b.name)}"></div>
      <div class="field" style="flex:0 0 74px;min-width:74px"><label>CD 分</label><input type="text" inputmode="numeric" class="numin" id="bf-m" value="${Math.floor(b.cd / 60)}"></div>
      <div class="field" style="flex:0 0 74px;min-width:74px"><label>秒</label><input type="text" inputmode="numeric" class="numin" id="bf-s" value="${b.cd % 60}"></div>
      <button class="btn tiny primary" id="bf-save">保存</button>
      <span class="buff-ago">已经放了 <input type="text" inputmode="numeric" class="numin" id="bf-ago" value="0"> 秒
        <button class="btn tiny" id="bf-cast-ago">从那时算</button></span>
    </div>` : ''
  return row + form
}
// 每 250ms 只改倒数的字、条和颜色，不整页重绘（免得练级的输入框失焦）
// doc 可以是主页面，也可以是小窗（两边元素 id 一样）
function buffPaintIn(doc) {
  const el = doc.getElementById('buff')
  if (!el) return
  const b = buffState()
  const n = b.at ? buffNow(b) : null, lv = buffLevel(b)
  if (!el.classList.contains(lv)) { el.classList.remove('calm', 'warn', 'hot', 'crit', 'now', 'off'); el.classList.add(lv) }
  const t = doc.getElementById('buff-t'), i = doc.getElementById('buff-i')
  if (t) t.textContent = !n ? '—' : lv === 'now' ? '该放了' : fmtMS(n.left)
  if (i) i.style.width = (n ? n.left / n.cd * 100 : 0).toFixed(1) + '%'
}
function buffPaint() {
  buffPaintIn(document)
  buffSchedule()   // 顺手把 10 分钟之后的声音续上
}
setInterval(buffPaint, 250)

/* ── 小窗：看视频时也能看到倒计时 ──
   Chrome / Edge 用「画中画」窗口（documentPictureInPicture）：浮在所有窗口最上面，视频播放器也盖得住。
   其它浏览器退回 window.open 一个小弹窗，自己摆到视频旁边。
   两种都是**主页面的代码在画小窗的内容** —— 声音只从主页面这一个 AudioContext 出来，
   不会两边各响一遍。代价是主页面得开着（最小化、切走都行），关了小窗就跟着失效。
   小窗自己的定时器负责刷新：小窗看得见，不会被浏览器放慢；主页面在后台慢了也不影响它。 */
function buffMiniHTML() {
  const b = buffState()
  return `<div class="buff mini ${buffLevel(b)}" id="buff">
    <div class="mini-top">
      <span class="buff-n" id="buff-n">${esc(b.name)}<small class="en">${fmtMS(b.cd * 1000)}</small></span>
      <span class="buff-t en" id="buff-t">—</span>
    </div>
    <span class="buff-bar"><i id="buff-i"></i></span>
    <div class="mini-btns">
      <button class="btn tiny ${b.at ? '' : 'primary'}" id="bf-cast">放了</button>
      <button class="btn tiny" id="bf-stop" ${b.at ? '' : 'disabled'}>停</button>
      <button class="btn tiny ghost" id="bf-snd">${b.mute ? '🔇' : '🔊'}</button>
    </div>
  </div>`
}
async function buffOpenMini() {
  let w = null
  if (window.documentPictureInPicture) {
    try { w = await window.documentPictureInPicture.requestWindow({ width: 300, height: 170 }) } catch (e) { console.warn('画中画打不开，改用小弹窗', e) }
  }
  if (!w) w = window.open('', 'mls-buff', 'popup,width=320,height=200')
  if (!w) { alert('浏览器拦住了弹出窗口。地址栏右边一般会有个「已拦截」的图标，点它允许这个网站弹窗就行。'); return }
  buffSetupMini(w)
}
// 往一个窗口里画小窗。和「怎么拿到窗口」分开，画中画、小弹窗、测试用的 iframe 都走这里
function buffSetupMini(w) {
  const d = w.document
  d.title = '增益倒计时'
  d.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  // 用主页面同一份样式（换成绝对地址，弹窗是 about:blank，相对路径找不到）
  document.querySelectorAll('link[rel=stylesheet]').forEach(l => {
    const c = d.createElement('link'); c.rel = 'stylesheet'; c.href = new URL(l.getAttribute('href'), location.href).href
    d.head.appendChild(c)
  })
  d.body.className = 'minibody'
  const draw = () => { d.body.innerHTML = buffMiniHTML(); buffPaintIn(d) }
  draw()
  w.focus()
  // 同名小弹窗再点一次会拿到同一个窗口：事件和定时器只挂一次，不然静音会被连按两下等于没按
  if (w.__mlsBound) return
  w.__mlsBound = true
  // 按钮：动作和主页面共用；放了 / 停 / 静音会改按钮本身，所以整块重画（250ms 的刷新只改字和条）
  d.addEventListener('click', e => {
    const id = e.target && e.target.id
    if (id === 'bf-cast') buffCast(0)
    else if (id === 'bf-stop') buffStop()
    else if (id === 'bf-snd') buffMute()
    else return
    draw()
  })
  d.addEventListener('pointerdown', () => { buffAudio().then(buffSchedule) })
  let last = ''
  const timer = w.setInterval(() => {
    // 主页面那边改了名字 / CD / 静音，小窗跟着整块重画
    const sig = localStorage.getItem(BUFF_KEY) || ''
    if (sig !== last) { last = sig; draw() } else buffPaintIn(d)
    buffSchedule()
  }, 250)
  w.addEventListener('pagehide', () => w.clearInterval(timer))
}
// 刷新后音频是关着的；用户点页面任意地方时把它打开、重新排上声音
document.addEventListener('pointerdown', () => {
  const b = buffState()
  if (!b.at || b.mute || (Buff.ctx && Buff.ctx.state === 'running')) return
  buffAudio().then(() => {
    buffSchedule()
    const tip = document.querySelector('.buff-tap'); if (tip) tip.remove()
  })
}, true)

/* ── 秒针：只改时钟文字，不整页重绘，免得输入框失焦 ── */
let tickTimer = null
function syncTick() {
  clearInterval(tickTimer)
  const c = activeChar()
  if (!c || !c.timer || c.timer.state !== 'running') return
  tickTimer = setInterval(() => {
    const el = document.getElementById('tm-time')
    const cc = activeChar()
    if (!el || !cc || !cc.timer) { clearInterval(tickTimer); return }
    el.textContent = fmtDur(timerMs(cc.timer))
  }, 1000)
}

/* ── 百分比框：直接敲数字，小数点自动补上 ──
   敲 1 1 5 6 依次显示 0.01 → 0.11 → 1.15 → 11.56。
   退格也按显示的字符走，和收银机/ATM 的输入手感一致。
   这么做主要是为了少出事故：以前要手打小数点，很容易留着上一次的值就按了「记一笔」。
   超出 4 位时像滚动一样只留最后 4 位：框里是 45.23，不清空直接敲 4 6 1 2，
   依次是 52.34 → 23.46 → 34.61 → 46.12。以前是截前 5 位再封顶，会被顶成 100.00 卡住，
   一不留神就记进一笔「打满一级」的假数据。 */
document.addEventListener('input', e => {
  const el = e.target
  if (!el.matches || !el.matches('input.pctin')) return
  let digits = el.value.replace(/\D/g, '').replace(/^0+/, '')
  // 100.00 本身是 5 位，单独放行；其余超过 4 位的只留最后 4 位
  if (digits.length > 4 && digits !== '10000') digits = digits.slice(-4)
  const v = Number(digits || 0)
  el.value = (v / 100).toFixed(2)
  const n = el.value.length
  try { el.setSelectionRange(n, n) } catch (_) { /* 忽略 */ }
})

/* ── 数字框聚焦时光标落到末尾，方便直接退格改数 ── */
document.addEventListener('focusin', e => {
  const el = e.target
  if (!el.matches || !el.matches('input.numin')) return
  // 等浏览器自己的点击定位跑完再挪，否则会被它覆盖
  requestAnimationFrame(() => {
    const n = el.value.length
    try { el.setSelectionRange(n, n) } catch (_) { /* 少数输入法下会抛，忽略 */ }
  })
})

/* ── 窗口宽度变了：热力图要重算放得下几周（只在记录 tab，那里没有输入框，重绘不会丢焦点） ── */
let resizeTimer = null
window.addEventListener('resize', () => {
  if (UI.tab !== 'log' || !S.chars.length) return
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(render, 200)
})

/* ── 空格键：暂停 / 继续 ── */
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.key !== ' ') return
  // 在输入框、下拉、按钮里按空格是人家自己的事
  if (e.target && e.target.closest && e.target.closest('input, select, textarea, button, [contenteditable]')) return
  const c = activeChar()
  if (!c || !c.timer) return
  e.preventDefault()
  if (c.timer.state === 'running') tmPause()
  else if (c.timer.state === 'paused') tmResume()
})

/* ───────────────── 登录 ─────────────────
   走 Supabase Auth：密码只在输入框里存在，直接发给 Supabase 校验，
   源代码里没有任何密码或哈希。数据在共用的 user_data 表（app='maple'），
   开了 RLS，一个账号只读得到自己那些行。 */

const ERR_CN = {
  'Invalid login credentials': '邮箱或密码不对',
  'Email not confirmed': '这个邮箱还没确认，去 Supabase 后台把它设成 confirmed',
}

function openApp() {
  document.getElementById('gate').hidden = true
  document.getElementById('logout').hidden = false
  app().hidden = false
  boot()
}

async function doLogin(e) {
  e.preventDefault()
  const email = document.getElementById('gate-email').value.trim()
  const pw = document.getElementById('gate-pw').value
  const err = document.getElementById('gate-err')
  const btn = document.getElementById('gate-go')
  err.textContent = ''; btn.disabled = true; btn.textContent = '登录中…'
  const { error } = await window.sbClient.auth.signInWithPassword({ email, password: pw })
  btn.disabled = false; btn.textContent = '进去'
  if (error) {
    err.textContent = ERR_CN[error.message] || error.message
    document.getElementById('gate-pw').value = ''
    return
  }
  openApp()
}

async function doLogout() {
  await window.sbClient.auth.signOut()
  localStorage.removeItem(LS)          // 别把数据留在这台机器上
  location.reload()
}

async function initGate() {
  document.getElementById('gate-sprite').innerHTML = spriteSVG('mushroom')
  document.getElementById('gate-form').addEventListener('submit', doLogin)
  document.getElementById('logout').addEventListener('click', doLogout)
  const { data } = await window.sbClient.auth.getSession()
  if (data?.session) { openApp(); return }
  document.getElementById('gate-email').focus()
}

/* ───────────────── 启动 ───────────────── */
async function boot() {
  loadLocal()
  backupLocal('启动')
  render()
  const cloud = await loadFromCloud()
  if (cloud && cloud.chars) {
    // 云端是空的、本地有东西 —— 绝不让「空」盖掉「有」，反过来把本地推上去。
    // 空状态多半是别处误操作或同步出岔子，不该被当成「最新」
    if (!cloud.chars.length && S.chars.length) {
      console.warn('云端是空的，本地有 ' + S.chars.length + ' 个角色 —— 保留本地并推上云端')
      saveToCloud(S)
      render()
      return
    }
    const cloudNewer = !S.updated_at || (cloud.updated_at && cloud.updated_at > S.updated_at)
    if (cloudNewer) {
      backupLocal('被云端覆盖前')
      S = Object.assign({ chars: [], activeId: null }, cloud)
      migrateAll()
      localStorage.setItem(LS, JSON.stringify(S))
      render()
    } else if (S.chars.length) {
      saveToCloud(S)
    }
  } else if (S.chars.length) {
    saveToCloud(S)
  }
}
initGate()
