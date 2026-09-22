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
let UI = {
  expUnit: localStorage.getItem('mls_unit') || 'pct',
  showTable: localStorage.getItem('mls_tbl') === '1',
  region: localStorage.getItem('mls_region') || MAPS[0].region,
  map: localStorage.getItem('mls_map') || '',
}
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
  app().innerHTML = charBar() + overview(c, k) + todayPanel(c, k) + timerPanel(c) + rankingPanel(c) + sessionsPanel(c) + planPanel(c, k) + logsPanel(c) + tablePanel(c, k)
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

  const lvText = k.lvPerDay >= 1
    ? `≈ ${k.lvPerDay.toFixed(1)} 级/天（按 Lv.${k.cur.level}）`
    : (k.lvPerDay > 0 ? `≈ ${(1 / k.lvPerDay).toFixed(1)} 天升 1 级` : '—')

  const curPct = expAt(k.cur.level) > 0 ? (k.cur.exp / expAt(k.cur.level) * 100) : 0

  return `<section class="panel">
    <div class="panel-t">总进度<span class="sub">${c.startDate} → ${c.targetDate}</span></div>
    <div class="row" style="align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:46px;flex:none">${spriteSVG(c.sprite)}</div>
      <div style="flex:1 1 auto;min-width:0">
        <div style="font-size:24px">${esc(c.name)}${c.job ? ` <span class="hint">${esc(c.job)}</span>` : ''}</div>
        <div class="en" style="font-size:18px;color:var(--wood-d)">Lv.${k.cur.level} · 本级 ${curPct.toFixed(2)}%</div>
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
let managing = false

document.addEventListener('click', e => {
  const t = e.target
  const pick = t.closest('[data-pick]')
  if (pick) { S.activeId = pick.dataset.pick; creating = false; save(); render(); return }

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
  return `<div class="field" style="flex:1 1 130px"><label>地区</label>
      <select id="mp-region">${regOpts}</select></div>
    <div class="field" style="flex:1 1 170px"><label>现在在哪练</label>
      <select id="mp-map">${mapOpts}</select></div>`
}

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

function segmentsOf(points) {
  const segs = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].ms - points[i - 1].ms
    const gain = gainBetween(points[i - 1], points[i])
    segs.push({ dt, gain, rate: rateOf(gain, dt), at: points[i].ms, level: points[i].level, map: points[i - 1].map || '' })
  }
  return segs
}

function chartHTML(points) {
  const segs = segmentsOf(points)
  if (!segs.length) return '<div class="empty">至少要两个打点才画得出图。</div>'
  const max = Math.max(...segs.map(x => Math.abs(x.rate)), 1)
  const hasNeg = segs.some(x => x.rate < 0)
  const bars = segs.map(sg => {
    const h = Math.round(Math.abs(sg.rate) / max * 100)
    const neg = sg.rate < 0
    return `<div class="cbar" title="${esc(sg.map || '没填地图')} · ${fmtShort(sg.dt)} 内 ${signed(sg.gain)} 经验">
      <div class="cbar-v ${neg ? 'neg' : ''}">${signed(sg.rate)}</div>
      <div class="cbar-pos">${neg ? '' : `<i style="height:${h}px"></i>`}</div>
      ${hasNeg ? `<div class="cbar-neg">${neg ? `<i style="height:${h}px"></i>` : ''}</div>` : ''}
      <div class="cbar-x">${fmtDur(sg.at).slice(0, 5)}</div>
      <div class="cbar-m">${esc(sg.map || '—')}</div>
    </div>`
  }).join('')
  return `<div class="chart"><div class="chart-bars">${bars}</div></div>
    <div class="hint">柱高 = 那一段的经验/小时，横轴是计时走到第几分钟。${hasNeg ? '往下的是掉经验的段。' : ''}</div>`
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
         <button class="btn" id="tm-pause">暂停</button>
         <button class="btn danger" id="tm-stop">终止</button>`
      : `<button class="btn primary" id="tm-resume">继续</button>
         <button class="btn" id="tm-mark">记一笔</button>
         <button class="btn danger" id="tm-stop">终止</button>`

  const live = pts.length >= 2
    ? `<div class="stats" style="margin-top:12px">
         <div class="stat hero"><div class="k">效率</div><div class="v">${signed(rate)}<small style="font-size:18px">/小时</small></div><div class="n">${pts.length} 个打点</div></div>
         <div class="stat"><div class="k">这段共打</div><div class="v">${signed(gain)}</div><div class="n">${Math.round(gain).toLocaleString('en-US')}</div></div>
       </div>
       ${chartHTML(pts)}`
    : (state === 'idle'
      ? `<div class="hint" style="margin-top:8px">填好当前等级和经验，按「开始」。中途随时「记一笔」，暂停也会自动记一笔。</div>`
      : `<div class="hint" style="margin-top:8px">已经记了起点。再「记一笔」就能算出效率了。</div>`)

  return `<section class="panel">
    <div class="panel-t">练级计时器<span class="sub">${label}</span></div>
    <div class="clock ${state}" id="tm-clock">${fmtDur(ms)}</div>
    <div class="row" style="margin-top:12px">
      <div class="field" style="flex:0 0 110px"><label>当前等级</label>
        <input type="number" id="tm-lv" min="1" max="200" value="${seed.level}"></div>
      <div class="field" style="flex:1 1 150px"><label>本级经验${unitPct ? '（%）' : '（点）'}</label>
        <input type="number" id="tm-exp" min="0" step="${unitPct ? '0.01' : '1'}" value="${seedVal}"></div>
    </div>
    <div class="row" style="margin-top:8px">
      ${mapPicker()}
      ${btns}
    </div>
    ${live}
  </section>`
}

// 把所有练级记录的段按地图汇总，算加权经验/小时
function mapRanking(c) {
  const acc = {}
  for (const s of c.sessions || []) {
    for (const sg of segmentsOf(s.points)) {
      if (!sg.map || sg.dt <= 0) continue
      const a = acc[sg.map] || (acc[sg.map] = { map: sg.map, ms: 0, gain: 0 })
      a.ms += sg.dt; a.gain += sg.gain
    }
  }
  return Object.values(acc).map(a => ({ ...a, rate: rateOf(a.gain, a.ms) }))
    .sort((x, y) => y.rate - x.rate)
}

function rankingPanel(c) {
  const rank = mapRanking(c)
  if (rank.length < 2) return ''
  const max = Math.max(...rank.map(r => Math.abs(r.rate)), 1)
  const rows = rank.map(r => `<div class="rank">
      <span class="rank-n">${esc(r.map)}</span>
      <span class="rank-bar"><i style="width:${Math.round(Math.abs(r.rate) / max * 100)}%"></i></span>
      <span class="rank-v ${r.rate < 0 ? 'neg' : ''}">${signed(r.rate)}/h</span>
      <span class="hint">${fmtShort(r.ms)}</span>
    </div>`).join('')
  return `<section class="panel">
    <div class="panel-t">地图效率排行<span class="sub">${esc(regionOf(rank[0].map))} · ${esc(rank[0].map)} 最快</span></div>
    <div class="ranklist">${rows}</div>
    <div class="hint" style="margin-top:8px">按所有练级记录里每一段的时长加权算的，打得越久的数越准。</div>
  </section>`
}

function sessionsPanel(c) {
  const list = (c.sessions || []).slice().reverse()
  if (!list.length) return ''
  const best = list.reduce((a, b) => (b.rate > a.rate ? b : a), list[0])
  const rows = list.map(s => `<details class="more sess">
      <summary>
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
  return { level: lv, exp: readExpInput(lv, document.getElementById('tm-exp').value), map: sel ? sel.value : '' }
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
  t.points.push({ ms: timerMs(t), ...p, at: new Date().toISOString() })
  if (!silent) { save(); render() }
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
    const el = document.getElementById('tm-clock')
    const cc = activeChar()
    if (!el || !cc || !cc.timer) { clearInterval(tickTimer); return }
    el.textContent = fmtDur(timerMs(cc.timer))
  }, 1000)
}

/* ───────────────── 软密码门禁 ─────────────────
   哈希写在前端，拦的是「随手点进来的人」，不是真正的攻击者。
   要真防住得上 Supabase RLS + 登录。 */
const PASS_HASH = '230c3f520dfcbfafedae6f43bdd90409cc3e40b53eb6615f88a0df1ea3bc13e3'
const PASS_KEY = 'mls_pass'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function openApp() {
  document.getElementById('gate').hidden = true
  app().hidden = false
  boot()
}

async function tryPass() {
  const inp = document.getElementById('gate-pw')
  const err = document.getElementById('gate-err')
  if (await sha256(inp.value.trim()) === PASS_HASH) {
    localStorage.setItem(PASS_KEY, PASS_HASH)
    openApp()
  } else {
    err.textContent = '暗号不对，再想想'
    inp.value = ''
    inp.focus()
  }
}

function initGate() {
  document.getElementById('gate-sprite').innerHTML = spriteSVG('mushroom')
  if (localStorage.getItem(PASS_KEY) === PASS_HASH) { openApp(); return }
  const inp = document.getElementById('gate-pw')
  document.getElementById('gate-go').addEventListener('click', tryPass)
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryPass() })
  inp.focus()
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
initGate()
