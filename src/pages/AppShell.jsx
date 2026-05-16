import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import HomePage from './HomePage'
import BoxesPage from './BoxesPage'
import ExpensesPage from './ExpensesPage'
import CouplePage from './CouplePage'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'home',     icon: '⌂',  label: 'Início' },
  { id: 'boxes',    icon: '◈',  label: 'Caixinhas' },
  { id: 'expenses', icon: '≡',  label: 'Despesas' },
  { id: 'couple',   icon: '♡',  label: 'Casal' },
]

export default function AppShell({ session }) {
  const [page, setPage] = useState('home')
  const [me, setMe] = useState(null)
  const [partner, setPartner] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    loadProfile()
  }, [session])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setMe(data)
    if (data?.partner_id) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.partner_id).single()
      setPartner(p)
    } else {
      setPartner(null)
    }
  }

  const ctx = { me, partner, session, refresh, loadProfile }

  return (
    <div className={styles.shell}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <span className={styles.logoMark}>💚</span>
          <span className={styles.logoText}>Casal</span>
        </div>
        <div className={styles.headerRight}>
          {me && (
            <div className={styles.userPill}>
              <div className={styles.avatar} style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                {me.avatar_initials}
              </div>
              <span className={styles.userName}>{me.name.split(' ')[0]}</span>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()} title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className={styles.main}>
        {page === 'home'     && <HomePage     key={refreshKey} {...ctx} onNav={setPage} />}
        {page === 'boxes'    && <BoxesPage    key={refreshKey} {...ctx} />}
        {page === 'expenses' && <ExpensesPage key={refreshKey} {...ctx} />}
        {page === 'couple'   && <CouplePage   key={refreshKey} {...ctx} onPartnerLinked={() => { loadProfile(); refresh() }} />}
      </main>

      {/* Bottom nav */}
      <nav className={styles.nav}>
        {NAV.map(n => (
          <button key={n.id} className={`${styles.navItem} ${page === n.id ? styles.navActive : ''}`} onClick={() => setPage(n.id)}>
            <span className={styles.navIcon}>{n.icon}</span>
            <span className={styles.navLabel}>{n.label}</span>
            {page === n.id && <span className={styles.navDot} />}
          </button>
        ))}
      </nav>
    </div>
  )
}
