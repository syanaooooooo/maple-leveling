// sync.js — 云端读写。数据在共用的 user_data 表（一个账号管所有 app），RLS 保证只读得到自己的
//   app='maple'，name='main'
const TABLE = 'user_data'
const APP = 'maple'

function setSyncBadge(state, text) {
  const el = document.getElementById('sync-badge')
  if (!el) return
  el.className = 'sync ' + state
  el.querySelector('span').textContent = text
}

async function currentUser() {
  const { data } = await window.sbClient.auth.getUser()
  return data?.user || null
}

async function loadFromCloud() {
  const user = await currentUser()
  if (!user) return null
  setSyncBadge('busy', '读取中')
  const { data, error } = await window.sbClient
    .from(TABLE).select('data')
    .eq('user_id', user.id).eq('app', APP).eq('name', 'main').maybeSingle()
  if (error) { console.warn('云端加载失败:', error.message); setSyncBadge('err', '离线'); return null }
  setSyncBadge('ok', '已同步')
  return data?.data || null
}

async function saveToCloud(payload) {
  const user = await currentUser()
  if (!user) return
  setSyncBadge('busy', '保存中')
  const { error } = await window.sbClient.from(TABLE).upsert(
    { user_id: user.id, app: APP, name: 'main', data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,app,name' }
  )
  if (error) { console.warn('云端保存失败:', error.message); setSyncBadge('err', '未同步'); return }
  setSyncBadge('ok', '已同步')
}
