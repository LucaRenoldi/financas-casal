import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import HomePage from './HomePage'
import BoxesPage from './BoxesPage'
import ExpensesPage from './ExpensesPage'
import IncomePage from './IncomePage'
import CouplePage from './CouplePage'
import HistoryPage from './HistoryPage'
import ReportPage from './ReportPage'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'home',     icon: '⌂',  label: 'Início' },
  { id: 'expenses', icon: '≡',  label: 'Despesas' },
  { id: 'income',   icon: '↑',  label: 'Renda' },
  { id: 'history',  icon: '⇅',  label: 'Histórico' },
  { id: 'report',   icon: '⊞',  label: 'Mensal' },
  { id: 'boxes',    icon: '◈',  label: 'Caixinhas' },
  { id: 'couple',   icon: '♡',  label: 'Casal' },
]

export default function AppShell({ user }) {
  const [page, setPage] = useState('home')
  const [me, setMe] = useState(null)
  const [partner, setPartner] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => { loadProfile() }, [user])

  async function loadProfile() {
    try {
      let snap = await getDoc(doc(db, 'profiles', user.uid))
      if (!snap.exists()) {
        const email = user.email || ''
        const name = user.displayName || email.split('@')[0] || 'Usuário'
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        await setDoc(doc(db, 'profiles', user.uid), {
          name, avatarInitials: initials, coupleCode: code,
          partnerId: null, createdAt: new Date().toISOString(),
        })
        snap = await getDoc(doc(db, 'profiles', user.uid))
      }
      const profile = { id: snap.id, ...snap.data() }
      setMe(profile)
      if (profile.partnerId) {
        const pSnap = await getDoc(doc(db, 'profiles', profile.partnerId))
        setPartner(pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null)
      } else {
        setPartner(null)
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    }
  }

  const ctx = { me, partner, user, refresh, loadProfile }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <span className={styles.logoMark}>💚</span>
          <span className={styles.logoText}>Casal</span>
        </div>
        <div className={styles.headerRight}>
          {me && (
            <div className={styles.userPill}>
              <div className={styles.avatar} style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                {me.avatarInitials}
              </div>
              <span className={styles.userName}>{me.name.split(' ')[0]}</span>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={() => signOut(auth)} title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {page === 'home'     && <HomePage     key={refreshKey} {...ctx} onNav={setPage} />}
        {page === 'income'   && <IncomePage   key={refreshKey} {...ctx} />}
        {page === 'expenses' && <ExpensesPage key={refreshKey} {...ctx} />}
        {page === 'boxes'    && <BoxesPage    key={refreshKey} {...ctx} />}
        {page === 'history'  && <HistoryPage  key={refreshKey} {...ctx} />}
        {page === 'report'   && <ReportPage   key={refreshKey} {...ctx} />}
        {page === 'couple'   && <CouplePage   key={refreshKey} {...ctx} onPartnerLinked={() => { loadProfile(); refresh() }} />}
      </main>

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
