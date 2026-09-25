// app.js — 冒险岛升级计划

/* ───────────────── 像素小人 ───────────────── */
const SPRITES = {
  mushroom: { label:'橙蘑菇', pal:{1:'#F2732C',2:'#FFE9C8',3:'#FFE0B2',4:'#4A2E1E',5:'#C4553B'}, g:[
    '............',
    '...111111...',
    '..11122111..',
    '.1112211111.',
    '.1111111221.',
    '.1111111111.',
    '..33333333..',
    '..34333343..',
    '..33333333..',
    '..33355333..',
    '...33..33...',
    '............'] },
  slime: { label:'绿水灵', pal:{1:'#6FC24A',2:'#22331A',3:'#3E6B2A'}, g:[
    '............',
    '....1111....',
    '...111111...',
    '..11111111..',
    '.1111111111.',
    '.1211111121.',
    '.1111111111.',
    '111111111111',
    '111133331111',
    '111111111111',
    '.1111111111.',
    '............'] },
  pig: { label:'粉红猪', pal:{1:'#F4A0B8',2:'#3A2028',3:'#E07D9B',4:'#8E3A57'}, g:[
    '............',
    '..1......1..',
    '.11......11.',
    '.1111111111.',
    '111111111111',
    '112111112111',
    '111111111111',
    '111133331111',
    '111134431111',
    '.1111111111.',
    '..11....11..',
    '............'] },
  snail: { label:'蓝蜗牛', pal:{1:'#5B8FD9',2:'#2E5AA8',3:'#9BD1F0',4:'#1E2A44'}, g:[
    '............',
    '............',
    '....1111....',
    '...112211...',
    '..11222211..',
    '..11122111..',
    '..11111111..',
    '.3111111113.',
    '333333333333',
    '.3343333433.',
    '..33333333..',
    '............'] },
  octo: { label:'章鱼', pal:{1:'#E85C5C',2:'#3A1414',3:'#FFD9A0'}, g:[
    '............',
    '...111111...',
    '..11111111..',
    '.1111111111.',
    '.1211111121.',
    '.1111111111.',
    '.1113333111.',
    '.1111111111.',
    '..11111111..',
    '.1.1.11.1.1.',
    '1...1..1...1',
    '............'] },
  yeti: { label:'雪人', pal:{1:'#EAF2FA',2:'#2B3A4A',3:'#7FB3D9'}, g:[
    '............',
    '...111111...',
    '..11111111..',
    '.1121111211.',
    '.1111111111.',
    '.1113333111.',
    '..11111111..',
    '.1111111111.',
    '111111111111',
    '111111111111',
    '.111....111.',
    '............'] },
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
  return `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${r}</svg>`
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
  mult: Number(localStorage.getItem('mls_mult')) || 1,
}
let saveTimer = null

function loadLocal() {
  try { const r = localStorage.getItem(LS); if (r) S = Object.assign(S, JSON.parse(r)) } catch (e) { console.warn(e) }
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

function currentOf(c) {
  const ds = Object.keys(c.logs || {}).sort()
  if (ds.length) { const d = ds[ds.length - 1]; return { ...c.logs[d], date: d } }
  return { level: c.startLevel, exp: c.startExp, date: c.startDate }
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
  // 今天开始时的位置：今天之前最后一条打卡，没有就用计划起点
  const ds = Object.keys(c.logs || {}).sort()
  const prevD = ds.filter(d => d < t).pop()
  const dayFrom = prevD ? c.logs[prevD] : { level: c.startLevel, exp: c.startExp }
  // 现在的位置：今天的打卡；计时器里有更靠前的打点就用打点，这样练级中进度条也会动
  let dayNow = c.logs && c.logs[t] ? c.logs[t] : dayFrom
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
    <button class="tabbtn ${t === 'log' ? 'on' : ''}" data-tab="log">效率记录</button>
  </section>`
}

function render() {
  if (!S.chars.length) { app().innerHTML = recoverBanner() + welcomeView(); return }
  const c = activeChar()
  if (!c) { S.activeId = S.chars[0].id }
  const k = compute(c)
  const view = UI.tab === 'log'
    ? statsPanel(c) + sessionsPanel(c)
    : overview(c, k) + todayPanel(c, k) + timerPanel(c) + planPanel(c, k) + logsPanel(c) + tablePanel(c, k)
  app().innerHTML = charBar() + tabBar() + view
  syncTick()
}

function charBar() {
  if (managing) return manageBar()
  const chips = S.chars.map(c => {
    const cur = currentOf(c)
    return `<div class="chip ${c.id === S.activeId ? 'on' : ''}" data-pick="${c.id}">
      ${spriteSVG(c.sprite)}
      <span><b>${esc(c.name)}</b><small class="en">Lv.${cur.level} → ${c.targetLevel}</small></span>
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
    const k = compute(c)
    return `<div class="mrow">
      <span class="mrow-s">${spriteSVG(c.sprite)}</span>
      <input type="text" class="mrow-name" data-rename="${c.id}" value="${esc(c.name)}">
      <span class="mrow-i en">Lv.${cur.level} → ${c.targetLevel}</span>
      <span class="mrow-i hint">${k.pct.toFixed(0)}% · ${(c.sessions || []).length} 次练级</span>
      <button class="btn tiny danger" data-del="${c.id}">删除</button>
    </div>`
  }).join('')
  return `<section class="panel">
    <div class="panel-t">管理角色<span class="sub">${S.chars.length} 个</span>
      <button class="btn tiny" id="manage-off" style="margin-left:8px">完成</button></div>
    <div class="mlist">${rows}</div>
    <div class="hint" style="margin-top:10px">改完名字点别处就存上了。删除会连着这个角色的打卡和练级记录一起没掉，不能撤销。</div>
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

function todayPanel(c, k) {
  const cur = k.cur
  const cap = expAt(cur.level)
  const unitPct = UI.expUnit === 'pct'
  const val = unitPct ? (cap > 0 ? (cur.exp / cap * 100).toFixed(2) : '0') : cur.exp
  const loggedToday = (c.logs || {})[today()]
  return `<section class="panel">
    <div class="panel-t">今日打卡<span class="sub">${today()}${loggedToday ? ' · 今天已记录' : ''}</span></div>
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
      <button class="btn primary" id="btn-log">记录</button>
    </div>
    <div class="hint" style="margin-top:8px">本级共需 <b class="en">${full(cap)}</b> 经验${cap > 0 ? `，还差 <b class="en">${full(Math.max(0, cap - cur.exp))}</b> 升下一级` : ''}</div>
  </section>`
}

function planPanel(c, k) {
  const opts = []
  for (let l = 2; l <= 200; l++) opts.push(`<option value="${l}" ${l === c.targetLevel ? 'selected' : ''}>Lv.${l}</option>`)
  const picks = SPRITE_KEYS.map(key =>
    `<div class="pick ${key === c.sprite ? 'on' : ''}" data-sprite="${key}" title="${SPRITES[key].label}">${spriteSVG(key)}</div>`).join('')
  return `<section class="panel">
    <div class="panel-t">目标设置</div>
    <div class="row">
      <div class="field"><label>目标等级</label><select id="in-tlv">${opts.join('')}</select></div>
      <div class="field"><label>目标日期</label><input type="date" id="in-tdate" value="${c.targetDate}"></div>
      <button class="btn primary" id="btn-target">更新目标</button>
    </div>
    <div class="hint" style="margin-top:8px">原计划每天升 <b class="en">${(k.lvPerDayPlan * 100).toFixed(1)}%</b> 一级 · 计划总长 <b class="en">${k.totalDays}</b> 天 · 已过 <b class="en">${k.elapsed}</b> 天</div>
    <div class="sep"></div>
    <details class="more">
      <summary>角色设置</summary>
      <div class="row" style="margin-top:8px">
        <div class="field"><label>名字</label><input type="text" id="in-name" value="${esc(c.name)}"></div>
        <div class="field"><label>职业（可空）</label><input type="text" id="in-job" value="${esc(c.job || '')}"></div>
        <button class="btn" id="btn-name">保存</button>
      </div>
      <div class="field" style="margin-top:10px"><label>头像</label><div class="picks">${picks}</div></div>
      <div class="sep"></div>
      <div class="row">
        <div class="field"><label>计划起点日期</label><input type="date" id="in-sdate" value="${c.startDate}"></div>
        <div class="field" style="flex:0 0 110px"><label>起点等级</label><input type="text" inputmode="numeric" class="numin" id="in-slv" value="${c.startLevel}"></div>
        <button class="btn ghost" id="btn-start">重设起点</button>
        <button class="btn danger" id="btn-del">删除角色</button>
      </div>
      <div class="hint" style="margin-top:6px">重设起点会把「已打经验」和进度条从新起点重新算，打卡记录保留。</div>
    </details>
  </section>`
}

function logsPanel(c) {
  const ds = Object.keys(c.logs || {}).sort().reverse()
  if (!ds.length) return `<section class="panel"><div class="panel-t">打卡记录</div><div class="empty">还没有记录。上面填一下当前等级和经验就开始了。</div></section>`
  const rows = ds.map((d, i) => {
    const cur = c.logs[d]
    const prevD = ds[i + 1]
    let gain = ''
    if (prevD) {
      const p = c.logs[prevD]
      const g = expBetween(p.level, p.exp, 200) - expBetween(cur.level, cur.exp, 200)
      if (g > 0) gain = `+${fmt(g)}`
    }
    const capp = expAt(cur.level)
    return `<div class="logline">
      <span class="d en">${d}</span>
      <span class="en">Lv.${cur.level}</span>
      <span class="hint">${capp > 0 ? (cur.exp / capp * 100).toFixed(1) + '%' : ''}</span>
      <span class="g en">${gain}</span>
      <button class="btn tiny" data-dellog="${d}">删</button>
    </div>`
  }).join('')
  return `<section class="panel"><div class="panel-t">打卡记录<span class="sub">${ds.length} 天</span></div><div class="logs">${rows}</div></section>`
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
    <div class="row" style="margin-top:12px">
      <button class="btn primary" id="n-create">创建计划</button>
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
    S.updated_at = new Date().toISOString()
    localStorage.setItem(LS, JSON.stringify(S))
    saveToCloud(S)
    render()
    return
  }

  if (t.id === 'n-create') return createChar()
  if (t.id === 'btn-log') return logToday()
  if (t.id === 'btn-target') return updateTarget()
  if (t.id === 'btn-name') return updateName()
  if (t.id === 'btn-start') return resetStart()
  if (t.id === 'btn-del') return delChar()

  const dl = t.closest('[data-dellog]')
  if (dl) {
    const c = activeChar()
    delete c.logs[dl.dataset.dellog]
    save(); render(); return
  }
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
  if (e.target.id === 'mp-region') {
    UI.region = e.target.value; UI.map = ''
    localStorage.setItem('mls_region', UI.region); localStorage.setItem('mls_map', '')
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
  const c = {
    id: 'c' + Date.now().toString(36),
    name, job, sprite: newSprite,
    startDate: today(), startLevel: lv, startExp: exp,
    targetLevel: tlv, targetDate: tdate,
    logs: { [today()]: { level: lv, exp } },
    timer: null, sessions: [],
    createdAt: new Date().toISOString()
  }
  S.chars.push(c)
  S.activeId = c.id
  creating = false
  save(); render()
}

function logToday() {
  const c = activeChar()
  const lv = clamp(parseInt(document.getElementById('in-lv').value, 10) || 1, 1, 200)
  const exp = readExpInput(lv, document.getElementById('in-exp').value)
  c.logs = c.logs || {}
  c.logs[today()] = { level: lv, exp }
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
  c.startLevel = lv
  c.startExp = clamp(c.startExp, 0, Math.max(0, expAt(lv) - 1))
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
function mapPicker() {
  const reg = MAPS.find(g => g.region === UI.region) || MAPS[0]
  const regOpts = MAPS.map(g => `<option value="${g.region}" ${g.region === reg.region ? 'selected' : ''}>${g.region}</option>`).join('')
  const mapOpts = ['<option value="">（不填）</option>']
    .concat(reg.maps.map(m => `<option value="${m.n}" ${m.n === UI.map ? 'selected' : ''}>${esc(m.n)}</option>`)).join('')
  // 经验卡/活动的倍率。开卡和裸练的数据不能混在一起算，所以它和地图一样是段的属性
  const multOpts = MULTS.map(m =>
    `<option value="${m}" ${m === UI.mult ? 'selected' : ''}>${multText(m)}</option>`).join('')
  return `<div class="field" style="flex:1 1 130px"><label>地区</label>
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
    .sort((x, y) => y.level - x.level || x.mult - y.mult || y.gain - x.gain)
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
    <div class="hint" style="margin-top:8px">主键是「等级 + 地图 + 倍率」—— 开经验卡和裸练分开统计，不会混着拉平均。按时长加权，等级高的在上。</div>
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
  // 顺手把最后一个打点写成今天的打卡
  const last = pts[pts.length - 1]
  c.logs = c.logs || {}
  c.logs[today()] = { level: last.level, exp: last.exp }
  c.timer = null
  save(); render()
}

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
   这么做主要是为了少出事故：以前要手打小数点，很容易留着上一次的值就按了「记一笔」。 */
document.addEventListener('input', e => {
  const el = e.target
  if (!el.matches || !el.matches('input.pctin')) return
  const digits = el.value.replace(/\D/g, '').replace(/^0+(?=\d{3})/, '').slice(0, 5)  // 最大 100.00
  const v = Math.min(10000, Number(digits || 0))
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
