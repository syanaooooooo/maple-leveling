// sync.js — 云端读写。复用与其它 webapp 共用的 Supabase 项目
// 主数据：snapshots 表，name='mls_main'
const CLOUD_KEY = 'mls_main'

function setSyncBadge(state, text) {
  const el = document.getElementById('sync-badge')
  if (!el) return
  el.className = 'sync ' + state
  el.querySelector('span').textContent = text
}

async function loadFromCloud() {
  if (!window.sbClient) return null
  setSyncBadge('busy', '读取中')
  const { data, error } = await window.sbClient
    .from('snapshots').select('data').eq('name', CLOUD_KEY).maybeSingle()
  if (error) { console.warn('云端加载失败:', error.message); setSyncBadge('err', '离线'); return null }
  setSyncBadge('ok', '已同步')
  return data?.data || null
}

async function saveToCloud(payload) {
  if (!window.sbClient) return
  setSyncBadge('busy', '保存中')
  const { data: updated, error: ue } = await window.sbClient
    .from('snapshots').update({ data: payload }).eq('name', CLOUD_KEY).select('name')
  if (ue) { console.warn('云端更新失败:', ue.message); setSyncBadge('err', '未同步'); return }
  if (!updated || updated.length === 0) {
    const { error: ie } = await window.sbClient
      .from('snapshots').insert({ name: CLOUD_KEY, data: payload })
    if (ie) { console.warn('云端插入失败:', ie.message); setSyncBadge('err', '未同步'); return }
  }
  setSyncBadge('ok', '已同步')
}
