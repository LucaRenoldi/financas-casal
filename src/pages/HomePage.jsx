import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PageWrap, Card, CardTitle, MetricGrid, Metric, Seg, SplitBar, Empty, fmt, fmtD, CAT_COLOR, CAT_ICON, MONTHS, todayStr } from '../components/UI'

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function HomePage({ me, partner, onNav }) {
  const [view, setView]     = useState('meu')
  const [period, setPeriod] = useState('monthly')
  const [month, setMonth]   = useState(new Date().getMonth())
  const [year, setYear]     = useState(new Date().getFullYear())
  const [rawExpenses, setRawExpenses] = useState([])
  const [rawIncomes, setRawIncomes]   = useState([])
  const [goals, setGoals]   = useState([])
  const [loading, setLoading] = useState(true)

  const viewOpts = [
    { value: 'meu', label: me?.name?.split(' ')[0] || 'Meu' },
    { value: 'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value: 'jun', label: 'Juntos' },
  ]

  useEffect(() => { loadAll() }, [me, partner])

  async function loadAll() {
    if (!me) return
    setLoading(true)
    try {
      const uids = [me.id, ...(partner ? [partner.id] : [])]
      const [expSnaps, incSnaps, boxSnaps] = await Promise.all([
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))))),
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'income'),   where('userId', '==', uid))))),
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'boxes'),    where('userId', '==', uid))))),
      ])
      setRawExpenses(expSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
      setRawIncomes(incSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
      setGoals(boxSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
    setLoading(false)
  }

  function filterView(arr) {
    if (view === 'meu') return arr.filter(x => x.userId === me?.id)
    if (view === 'par') return arr.filter(x => partner && x.userId === partner.id)
    return arr
  }

  /* ── monthly filter ── */
  const m     = String(month + 1).padStart(2, '0')
  const start = `${year}-${m}-01`
  const end   = `${year}-${m}-31`

  const allExp   = rawExpenses.filter(e => e.expenseDate >= start && e.expenseDate <= end)
  const allInc   = rawIncomes.filter(i => i.date >= start && i.date <= end)
  const shownExp = filterView(allExp).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  const shownInc = filterView(allInc)

  const totalExp = shownExp.reduce((s, e) => s + Number(e.amount), 0)
  const totalInc = shownInc.reduce((s, i) => s + Number(i.amount), 0)
  const saldo    = totalInc - totalExp

  const myExpTotal  = allExp.filter(e => e.userId === me?.id).reduce((s, e) => s + Number(e.amount), 0)
  const parExpTotal = partner ? allExp.filter(e => e.userId === partner.id).reduce((s, e) => s + Number(e.amount), 0) : 0
  const myPct       = Math.round(myExpTotal / (myExpTotal + parExpTotal || 1) * 100)

  /* ── weekly data ── */
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeklyData = Array.from({ length: 5 }, (_, w) => {
    const d1 = w * 7 + 1
    const d2 = Math.min(d1 + 6, daysInMonth)
    if (d1 > daysInMonth) return null
    const baseExp = filterView(rawExpenses.filter(e => e.expenseDate?.startsWith(`${year}-${m}`)))
    const baseInc = filterView(rawIncomes.filter(i => i.date?.startsWith(`${year}-${m}`)))
    const income  = baseInc.filter(i => { const d = parseInt(i.date.split('-')[2]); return d >= d1 && d <= d2 }).reduce((s, i) => s + Number(i.amount), 0)
    const expense = baseExp.filter(e => { const d = parseInt(e.expenseDate.split('-')[2]); return d >= d1 && d <= d2 }).reduce((s, e) => s + Number(e.amount), 0)
    return { label: `S${w + 1}`, income, expense }
  }).filter(Boolean)

  /* ── annual data ── */
  const yearStr = String(year)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const mp  = `${yearStr}-${String(i + 1).padStart(2, '0')}`
    const inc = filterView(rawIncomes.filter(x => x.date?.startsWith(mp))).reduce((s, x) => s + Number(x.amount), 0)
    const exp = filterView(rawExpenses.filter(e => e.expenseDate?.startsWith(mp))).reduce((s, e) => s + Number(e.amount), 0)
    return { label: MONTHS_SHORT[i], income: inc, expense: exp }
  })

  const yearTotalInc = monthlyData.reduce((s, d) => s + d.income, 0)
  const yearTotalExp = monthlyData.reduce((s, d) => s + d.expense, 0)
  const yearSaldo    = yearTotalInc - yearTotalExp

  /* ── chart data ── */
  const chartData = period === 'monthly' ? weeklyData : monthlyData
  const chartMax  = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1)

  /* ── faturas em aberto ── */
  const today = todayStr()
  const futureInst = rawExpenses.filter(e =>
    e.isInstallment && e.expenseDate > today &&
    (view === 'meu' ? e.userId === me?.id : view === 'par' ? e.userId === partner?.id : true)
  )
  const instGroupsMap = {}
  futureInst.forEach(e => {
    if (!instGroupsMap[e.installmentGroupId]) {
      instGroupsMap[e.installmentGroupId] = { description: e.description, amount: e.amount, remaining: [] }
    }
    instGroupsMap[e.installmentGroupId].remaining.push(e)
  })
  const instGroups = Object.values(instGroupsMap)
    .map(g => ({ ...g, remaining: g.remaining.sort((a, b) => a.expenseDate.localeCompare(b.expenseDate)) }))
    .sort((a, b) => (a.remaining[0]?.expenseDate || '').localeCompare(b.remaining[0]?.expenseDate || ''))
  const instTotal = futureInst.reduce((s, e) => s + Number(e.amount), 0)

  /* ── goals ── */
  const shownGoals = goals.filter(b =>
    view === 'meu' ? (b.userId === me?.id || b.isCoupleGoal)
    : view === 'par' ? ((partner && b.userId === partner.id) || b.isCoupleGoal)
    : b.isCoupleGoal
  ).sort((a, b) => {
    const pA = Math.min((a.currentAmount / (a.targetAmount || 1)) * 100, 100)
    const pB = Math.min((b.currentAmount / (b.targetAmount || 1)) * 100, 100)
    return pB - pA
  }).slice(0, 4)

  const dispInc = period === 'monthly' ? totalInc : yearTotalInc
  const dispExp = period === 'monthly' ? totalExp : yearTotalExp
  const dispSaldo = period === 'monthly' ? saldo : yearSaldo

  return (
    <PageWrap>
      {/* ── Header ── */}
      <div className="fade-up" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', gap:4 }}>
            {['monthly','annual'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding:'5px 13px', borderRadius:99, fontSize:12, fontWeight:700, cursor:'pointer', border:'none',
                background: period === p ? 'var(--green)' : 'var(--bg3)',
                color: period === p ? '#000' : 'var(--tx2)',
                outline: period !== p ? '1px solid var(--bd2)' : 'none',
                transition:'all .15s',
              }}>
                {p === 'monthly' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <MonthBtn onClick={() => setYear(y => y - 1)}>‹</MonthBtn>
            <span style={{ fontSize:13, color:'var(--tx2)', minWidth:36, textAlign:'center', fontWeight:600 }}>{year}</span>
            <MonthBtn onClick={() => setYear(y => y + 1)}>›</MonthBtn>
          </div>
        </div>

        {period === 'monthly' && (
          <div style={{ display:'flex', overflowX:'auto', gap:5, padding:'2px 0 4px', scrollbarWidth:'none' }}>
            {MONTHS_SHORT.map((ml, i) => (
              <button key={i} onClick={() => setMonth(i)} style={{
                padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:600, flexShrink:0, cursor:'pointer', border:'none',
                background: month === i ? 'var(--green)' : 'var(--bg3)',
                color: month === i ? '#000' : 'var(--tx2)',
                outline: month !== i ? '1px solid var(--bd2)' : 'none',
                transition:'all .15s',
              }}>
                {ml}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      {/* Metrics */}
      <div className="fade-up fade-up-2">
        <MetricGrid>
          <Metric label="Renda"  value={loading ? '…' : fmt(dispInc)}   color="var(--green)" />
          <Metric label="Gastos" value={loading ? '…' : fmt(dispExp)}   color="var(--red)" />
          <Metric label="Sobrou" value={loading ? '…' : fmt(dispSaldo)} color={dispSaldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
        </MetricGrid>
      </div>

      {/* Renda vs Gastos chart */}
      <div className="fade-up fade-up-2">
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:600 }}>
              {period === 'monthly' ? `Semanas · ${MONTHS[month]}` : `Meses · ${year}`}
            </span>
            <div style={{ display:'flex', gap:10 }}>
              <LegendDot color="var(--green)" label="Renda" />
              <LegendDot color="var(--red)"   label="Gastos" />
            </div>
          </div>
          {loading
            ? <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tx3)' }}>Carregando…</div>
            : <BarChart data={chartData} maxVal={chartMax} />
          }
        </Card>
      </div>

      {/* Partner participation (Juntos view) */}
      {view === 'jun' && partner && (
        <div className="fade-up fade-up-3">
          <Card>
            <CardTitle>Participação nos gastos</CardTitle>
            <SplitBar aLabel={me?.name?.split(' ')[0]} aPct={myPct} bLabel={partner?.name?.split(' ')[0]} bPct={100 - myPct} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:14 }}>
              <MiniStatCard label={me?.name?.split(' ')[0]} value={fmt(myExpTotal)} color="var(--green)" />
              <MiniStatCard label={partner?.name?.split(' ')[0]} value={fmt(parExpTotal)} color="var(--pink)" />
            </div>
          </Card>
        </div>
      )}

      {/* Goals */}
      {shownGoals.length > 0 && (
        <div className="fade-up fade-up-3">
          <Card>
            <CardTitle action={<button onClick={() => onNav('boxes')} style={{ fontSize:12, color:'var(--green)', fontWeight:500, background:'none', border:'none', cursor:'pointer' }}>ver todas →</button>}>
              Metas
            </CardTitle>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {shownGoals.map(b => {
                const pct = b.goalAmount > 0 ? Math.min(Math.round((b.currentAmount / b.goalAmount) * 100), 100) : 0
                const done = pct >= 100
                return (
                  <div key={b.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <span style={{ fontSize:16 }}>{b.bank === 'Nubank' ? '🟣' : '🟠'}</span>
                        <span style={{ fontSize:13, fontWeight:500 }}>{b.name}</span>
                        {b.isCoupleGoal && <Tag color="var(--purple)">casal</Tag>}
                        {done && <Tag color="var(--green)">✓ completa</Tag>}
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color: done ? 'var(--green)' : 'var(--tx2)' }}>{pct}%</span>
                    </div>
                    <div style={{ height:5, background:'var(--bg4)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background: done ? 'var(--green)' : 'var(--purple)', transition:'width .4s' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                      <span style={{ fontSize:10, color:'var(--tx3)' }}>{fmtD(b.currentAmount || 0)}</span>
                      <span style={{ fontSize:10, color:'var(--tx3)' }}>meta: {fmtD(b.goalAmount || 0)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Faturas em aberto */}
      {!loading && instGroups.length > 0 && (
        <div className="fade-up fade-up-3">
          <Card>
            <CardTitle action={<span style={{ fontSize:11, fontWeight:700, color:'var(--purple)' }}>{fmt(instTotal)} em aberto</span>}>
              Faturas em aberto
            </CardTitle>
            {instGroups.map((grp, i) => {
              const next = grp.remaining[0]
              const nextDate = next ? new Date(next.expenseDate + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) : ''
              const rem = grp.remaining.length
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i < instGroups.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                  <div style={{ width:36, height:36, borderRadius:'var(--r-sm)', background:'rgba(167,139,250,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>💳</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{grp.description}</div>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginTop:2 }}>
                      {rem} parcela{rem > 1 ? 's' : ''} restante{rem > 1 ? 's' : ''} · próxima: {nextDate}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--purple)' }}>{fmtD(grp.amount)}/mês</div>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginTop:1 }}>total: {fmtD(grp.amount * rem)}</div>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* Recent expenses */}
      {period === 'monthly' && (
        <div className="fade-up fade-up-4">
          <Card>
            <CardTitle action={<button onClick={() => onNav('expenses')} style={{ fontSize:12, color:'var(--green)', fontWeight:500, background:'none', border:'none', cursor:'pointer' }}>ver todas →</button>}>
              Últimas despesas
            </CardTitle>
            {loading
              ? <div style={{ color:'var(--tx3)', fontSize:14, textAlign:'center', padding:'1rem' }}>Carregando…</div>
              : !shownExp.length
              ? <Empty icon="🎉" title="Nenhuma despesa!" sub="Toque em + para adicionar" />
              : shownExp.slice(0, 5).map(e => <ExpRow key={e.id} e={e} me={me} partner={partner} />)
            }
          </Card>
        </div>
      )}
    </PageWrap>
  )
}

/* ── Sub-components ── */

function BarChart({ data, maxVal }) {
  const W = 340, H = 150
  const PL = 6, PR = 6, PT = 8, PB = 22
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const n = data.length
  if (!n) return null
  const groupW = chartW / n
  const barGap = 1.5
  const barW   = Math.min((groupW - barGap * 4) / 2, 13)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }} aria-hidden="true">
      <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="var(--bd)" strokeWidth={1} />
      {data.map((d, i) => {
        const cx   = PL + i * groupW + groupW / 2
        const baseY = PT + chartH
        const incH  = (d.income / maxVal) * chartH
        const expH  = (d.expense / maxVal) * chartH
        return (
          <g key={i}>
            {incH > 0.5 && <rect x={cx - barW - barGap} y={baseY - incH} width={barW} height={incH} fill="var(--green)" opacity={0.85} rx={2} />}
            {expH > 0.5 && <rect x={cx + barGap} y={baseY - expH} width={barW} height={expH} fill="var(--red)"   opacity={0.85} rx={2} />}
            <text x={cx} y={H - 5} textAnchor="middle" fontSize={9} fill="var(--tx3)" fontFamily="system-ui,sans-serif">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--tx2)' }}>
      <span style={{ width:8, height:8, borderRadius:2, background:color, display:'inline-block' }} />
      {label}
    </span>
  )
}

function Tag({ color, children }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:`${color}22`, color }}>
      {children}
    </span>
  )
}

function MiniStatCard({ label, value, color }) {
  return (
    <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'10px 12px', borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:700, color }}>{value}</div>
    </div>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
      {children}
    </button>
  )
}

export function ExpRow({ e, me, partner }) {
  const isMe = e.userId === me?.id
  const col  = isMe ? 'var(--green)' : 'var(--pink)'
  const d    = new Date(e.expenseDate + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 0', borderBottom:'1px solid var(--bd)' }}>
      <div style={{ width:38, height:38, borderRadius:'var(--r-sm)', background:`${CAT_COLOR[e.category]||'#888'}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
        {CAT_ICON[e.category] || '💸'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</div>
        <div style={{ fontSize:11, color:col, marginTop:2, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          {e.category}
          {e.isShared && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:'rgba(167,139,250,0.12)', color:'var(--purple)' }}>casal</span>}
          {e.isInstallment && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:'rgba(167,139,250,0.15)', color:'var(--purple)' }}>💳 {e.installmentNumber}/{e.installmentCount}</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>−{fmtD(e.amount)}</div>
        <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{d}</div>
      </div>
    </div>
  )
}
