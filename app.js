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
function expBetween(lv, exp, toLv) {
  if (toLv <= lv) return 0
  let t = Math.max(0, expAt(lv) - exp)
  for (let l = lv + 1; l < toLv; l++) t += expAt(l)
  return t
}

/* ───────────────── 状态 ───────────────── */
const LS = 'mls_v1'
let S = { chars: [], activeId: null, updated_at: null }
let UI = { expUnit: localStorage.getItem('mls_unit') || 'pct', showTable: localStorage.getItem('mls_tbl') === '1' }
let saveTimer = null

function loadLocal() {
  try { const r = localStorage.getItem(LS); if (r) S = Object.assign(S, JSON.parse(r)) } catch (e) { console.warn(e) }
}
function save(push = true) {
  S.updated_at = new Date().toISOString()
  localStorage.setItem(LS, JSON.stringify(S))
  if (push) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveToCloud(S), 600)
  }
}
const activeChar = () => S.chars.find(c => c.id === S.activeId) || S.chars[0] || null

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
  const daysLeft = diffDays(t, c.targetDate)
  const dailyPlan = totalPlan / totalDays
  const dailyNeed = daysLeft > 0 ? remain / daysLeft : remain
  const expected = Math.min(totalPlan, dailyPlan * elapsed)
  const aheadDays = dailyPlan > 0 ? (done - expected) / dailyPlan : 0
  const pace = elapsed > 0 ? done / elapsed : 0
  const etaDate = (pace > 0 && remain > 0) ? addDays(t, Math.ceil(remain / pace)) : null
  const finished = remain <= 0
  const lvPerDay = expAt(cur.level) > 0 ? dailyNeed / expAt(cur.level) : 0
  return { cur, totalPlan, remain, done, pct, totalDays, elapsed, daysLeft, dailyPlan, dailyNeed, aheadDays, pace, etaDate, finished, lvPerDay }
}

/* ───────────────── 渲染 ───────────────── */
const app = () => document.getElementById('app')

function render() {
  if (!S.chars.length) { app().innerHTML = welcomeView(); return }
  const c = activeChar()
  if (!c) { S.activeId = S.chars[0].id }
  const k = compute(c)
  app().innerHTML = charBar() + overview(c, k) + todayPanel(c, k) + planPanel(c, k) + logsPanel(c) + tablePanel(c, k)
}

function charBar() {
  const chips = S.chars.map(c => {
    const cur = currentOf(c)
    return `<div class="chip ${c.id === S.activeId ? 'on' : ''}" data-pick="${c.id}">
      ${spriteSVG(c.sprite)}
      <span><b>${esc(c.name)}</b><small class="en">Lv.${cur.level} → ${c.targetLevel}</small></span>
    </div>`
  }).join('')
  return `<section class="panel">
    <div class="panel-t">我的角色<span class="sub">${S.chars.length} 个</span></div>
    <div class="chars">${chips}<div class="chip add" data-new="1">＋ 新角色</div></div>
  </section>`
}

function overview(c, k) {
  let badge
  if (k.finished) badge = `<span class="badge done">🎉 已达成目标</span>`
  else if (k.daysLeft < 0) badge = `<span class="badge behind">已过目标日期 ${-k.daysLeft} 天</span>`
  else if (k.aheadDays >= 0.5) badge = `<span class="badge ahead">超前 ${k.aheadDays.toFixed(1)} 天</span>`
  else if (k.aheadDays <= -0.5) badge = `<span class="badge behind">落后 ${(-k.aheadDays).toFixed(1)} 天</span>`
  else badge = `<span class="badge ontime">刚好跟上计划</span>`

  const lvText = k.lvPerDay >= 1
    ? `≈ ${k.lvPerDay.toFixed(1)} 级/天（按 Lv.${k.cur.level}）`
    : (k.lvPerDay > 0 ? `≈ ${(1 / k.lvPerDay).toFixed(1)} 天升 1 级` : '—')

  const curPct = expAt(k.cur.level) > 0 ? (k.cur.exp / expAt(k.cur.level) * 100) : 0

  return `<section class="panel">
    <div class="panel-t">总进度<span class="sub">${c.startDate} → ${c.targetDate}</span></div>
    <div class="row" style="align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:46px;flex:none">${spriteSVG(c.sprite)}</div>
      <div style="flex:1 1 auto;min-width:0">
        <div style="font-size:16px">${esc(c.name)}${c.job ? ` <span class="hint">${esc(c.job)}</span>` : ''}</div>
        <div class="en" style="font-size:12px;color:var(--wood-d)">Lv.${k.cur.level} · 本级 ${curPct.toFixed(2)}%</div>
      </div>
      ${badge}
    </div>
    <div class="bar"><span style="width:${k.pct.toFixed(2)}%"></span><em class="en">${k.pct.toFixed(1)}%</em></div>
    <div class="hint" style="margin-top:6px">已打 ${fmt(k.done)} / 共 ${fmt(k.totalPlan)} 经验 · 全程平均每天要升 ${k.daysLeft > 0 ? ((c.targetLevel - k.cur.level) / k.daysLeft).toFixed(2) : '—'} 级</div>
    <div class="stats">
      <div class="stat hero"><div class="k">每天需要</div><div class="v">${fmt(k.dailyNeed)}</div><div class="n">${lvText}</div></div>
      <div class="stat"><div class="k">剩余经验</div><div class="v">${fmt(k.remain)}</div><div class="n">${full(k.remain)}</div></div>
      <div class="stat"><div class="k">剩余天数</div><div class="v en">${k.daysLeft > 0 ? k.daysLeft : (k.daysLeft === 0 ? '今天' : '超时')}</div><div class="n">目标 ${c.targetDate}</div></div>
      <div class="stat"><div class="k">按当前速度</div><div class="v">${k.etaDate ? mmdd(k.etaDate) : '—'}</div><div class="n">${k.etaDate ? '预计 ' + k.etaDate + ' 达成' : '还没有打卡数据'}</div></div>
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
        <input type="number" id="in-lv" min="1" max="200" value="${cur.level}">
      </div>
      <div class="field" style="flex:1 1 160px">
        <label>本级经验${unitPct ? '（%）' : '（点）'}</label>
        <input type="number" id="in-exp" min="0" step="${unitPct ? '0.01' : '1'}" value="${val}">
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
    <div class="hint" style="margin-top:8px">原计划日均 <b class="en">${fmt(k.dailyPlan)}</b> 经验 · 计划总长 <b class="en">${k.totalDays}</b> 天 · 已过 <b class="en">${k.elapsed}</b> 天</div>
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
        <div class="field" style="flex:0 0 110px"><label>起点等级</label><input type="number" id="in-slv" min="1" max="200" value="${c.startLevel}"></div>
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
  for (let l = k.cur.level; l < c.targetLevel; l++) {
    const need = l === k.cur.level ? Math.max(0, expAt(l) - k.cur.exp) : expAt(l)
    cum += need
    const eta = k.dailyNeed > 0 ? addDays(today(), Math.ceil(cum / k.dailyNeed)) : '—'
    rows += `<tr class="${l === k.cur.level ? 'mark' : ''}">
      <td class="lv">Lv.${l} → ${l + 1}</td>
      <td class="en">${full(need)}</td>
      <td class="en">${fmt(cum)}</td>
      <td class="en">${eta}</td>
    </tr>`
  }
  return `<section class="panel">
    <div class="panel-t">升级明细<span class="sub">按每天 ${fmt(k.dailyNeed)} 经验推算</span></div>
    <details class="more" id="tbl" ${UI.showTable ? 'open' : ''}>
      <summary>展开每一级需要多少经验 / 预计哪天到</summary>
      <div class="tablewrap" style="margin-top:8px"><table>
        <thead><tr><th>等级</th><th>所需经验</th><th>累计</th><th>预计达成</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </details>
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
      <div class="field" style="flex:0 0 110px"><label>当前等级</label><input type="number" id="n-lv" min="1" max="199" value="30"></div>
      <div class="field" style="flex:0 0 130px"><label>本级经验 %</label><input type="number" id="n-exp" min="0" max="100" step="0.01" value="0"></div>
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

document.addEventListener('click', e => {
  const t = e.target
  const pick = t.closest('[data-pick]')
  if (pick) { S.activeId = pick.dataset.pick; creating = false; save(); render(); return }

  if (t.closest('[data-new]')) { creating = true; newSprite = SPRITE_KEYS[0]; app().innerHTML = welcomeView(); return }
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

/* ───────────────── 启动 ───────────────── */
async function boot() {
  loadLocal()
  render()
  const cloud = await loadFromCloud()
  if (cloud && cloud.chars) {
    const cloudNewer = !S.updated_at || (cloud.updated_at && cloud.updated_at > S.updated_at)
    if (cloudNewer) {
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
boot()
