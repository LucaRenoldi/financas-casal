import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PageWrap, Card, Seg, MetricGrid, Metric, Empty, fmt, fmtD, CAT_ICON, CAT_COLOR } from '../components/UI'

const SOURCE_ICON = {
  'Salário': '💼', 'Freelance': '💻', 'Investimentos': '📈',
  'Aluguel': '🏠', 'Presente': '🎁', 'Outros': '💰',
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function HistoryPage({ me, partner }) {
  const [view, setView]         = useState('meu')
  const [month, setMonth]       = useState(new Date().getMonth())
  const [year, setYear]         = useState(new Date().getFullYear())
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes]   = useState([])
  const [loading, setLoading]   = useState(true)

  const viewOpts = [
    { value: 'meu', label: me?.name?.split(' ')[0] || 'Meu' },
    { value: 'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value: 'jun', label: 'Juntos' },
  ]

  useEffect(() => { load() }, [month, year, me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    try {
      const m     = String(month + 1).padStart(2, '0')
      const start = `${year}-${m}-01`
      const end   = `${year}-${m}-31`
      const uids  = [me.id, ...(partner ? [partner.id] : [])]

      const [expSnaps, incSnaps] = await Promise.all([
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))))),
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'income'),   where('userId', '==', uid))))),
      ])

      setExpenses(
        expSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data(), _type: 'expense', _date: d.data().expenseDate })))
          .filter(e => e._date >= start && e._date <= end)
      )
      setIncomes(
        incSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data(), _type: 'income', _date: d.data().date })))
          .filter(i => i._date >= start && i._date <= end)
      )
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
    setLoading(false)
  }

  const shownExp = view === 'meu' ? expenses.filter(e => e.userId === me?.id)
    : view === 'par' ? expenses.filter(e => partner && e.userId === partner.id)
    : expenses

  const shownInc = view === 'meu' ? incomes.filter(i => i.userId === me?.id)
    : view === 'par' ? incomes.filter(i => partner && i.userId === partner.id)
    : incomes

  const totalInc = shownInc.reduce((s, i) => s + Number(i.amount), 0)
  const totalExp = shownExp.reduce((s, e) => s + Number(e.amount), 0)
  const saldo    = totalInc - totalExp

  const all = [...shownInc, ...shownExp].sort((a, b) => b._date.localeCompare(a._date))

  const byDate = {}
  all.forEach(tx => {
    if (!byDate[tx._date]) byDate[tx._date] = []
    byDate[tx._date].push(tx)
  })
  const dateGroups = Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))

  function chMonth(d) {
    let m = month + d, y = year
    if (m > 11) { m = 0; y++ }
    if (m < 0)  { m = 11; y-- }
    setMonth(m); setYear(y)
  }

  return (
    <PageWrap>
      {/* Header */}
      <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)' }}>Histórico</div>
          <div style={{ fontSize:13, color:'var(--tx2)' }}>{MONTHS[month]} {year}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <MonthBtn onClick={() => chMonth(-1)}>‹</MonthBtn>
          <div style={{ fontSize:12, color:'var(--tx2)', display:'flex', alignItems:'center', padding:'0 4px' }}>
            {String(month + 1).padStart(2, '0')}/{year}
          </div>
          <MonthBtn onClick={() => chMonth(1)}>›</MonthBtn>
        </div>
      </div>

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      <div className="fade-up fade-up-2">
        <MetricGrid>
          <Metric label="Entradas" value={loading ? '…' : fmt(totalInc)} color="var(--green)" />
          <Metric label="Saídas"   value={loading ? '…' : fmt(totalExp)} color="var(--red)" />
          <Metric label="Saldo"    value={loading ? '…' : fmt(saldo)}    color={saldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
        </MetricGrid>
      </div>

      <div className="fade-up fade-up-3">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
        ) : !all.length ? (
          <Empty icon="📋" title="Sem movimentações" sub="Nenhuma entrada ou saída neste mês" />
        ) : (
          dateGroups.map(([date, items]) => (
            <div key={date} style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.8px', padding:'10px 2px 6px' }}>
                {new Date(date + 'T12:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}
              </div>
              <Card style={{ padding:0, overflow:'hidden' }}>
                {items.map((tx, i) => (
                  <TxRow key={tx.id + tx._type} tx={tx} me={me} partner={partner} isLast={i === items.length - 1} />
                ))}
              </Card>
            </div>
          ))
        )}
      </div>
    </PageWrap>
  )
}

function TxRow({ tx, me, partner, isLast }) {
  const isIncome = tx._type === 'income'
  const icon     = isIncome ? (SOURCE_ICON[tx.source] || '💰') : (CAT_ICON[tx.category] || '💸')
  const iconBg   = isIncome ? 'rgba(0,200,150,0.12)' : `${CAT_COLOR[tx.category] || '#888'}18`
  const label    = isIncome ? tx.source : tx.description
  const sublabel = isIncome ? (tx.note || null) : tx.category
  const amtColor = isIncome ? 'var(--green)' : 'var(--red)'
  const sign     = isIncome ? '+' : '−'

  const isOwn = tx.userId === me?.id
  const ownerName = isOwn
    ? (me?.name?.split(' ')[0] || 'você')
    : (partner?.name?.split(' ')[0] || 'parceiro(a)')

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: isLast ? 'none' : '1px solid var(--bd)' }}>
      {/* Type indicator bar */}
      <div style={{ width:3, alignSelf:'stretch', borderRadius:99, background: isIncome ? 'var(--green)' : 'var(--red)', flexShrink:0 }} />

      <div style={{ width:40, height:40, borderRadius:'var(--r-sm)', background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {icon}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</div>
        <div style={{ fontSize:11, color:'var(--tx2)', marginTop:2, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          {sublabel && <span>{sublabel}</span>}
          <span style={{ color:'var(--tx3)' }}>{ownerName}</span>
          {tx.isInstallment && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:'rgba(167,139,250,0.15)', color:'var(--purple)' }}>
              💳 {tx.installmentNumber}/{tx.installmentCount}
            </span>
          )}
          {tx.isShared && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:'rgba(167,139,250,0.12)', color:'var(--purple)' }}>
              casal
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:700, color:amtColor }}>{sign}{fmtD(tx.amount)}</div>
        <div style={{ fontSize:10, color:'var(--tx3)', marginTop:1 }}>{isIncome ? 'entrada' : 'saída'}</div>
      </div>
    </div>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}
