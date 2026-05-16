import { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js'
import { db } from '../lib/firebase'
import { PageWrap, Card, CardTitle, MetricGrid, Metric, Seg, SplitBar, Empty, fmt, fmtD, CAT_COLOR, CAT_ICON, MONTHS } from '../components/UI'

Chart.register(ArcElement, DoughnutController, Tooltip, Legend)

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function HomePage({ me, partner, onNav }) {
  const [view, setView]         = useState('meu')
  const [yearMode, setYearMode] = useState(false)
  const [month, setMonth]       = useState(new Date().getMonth())
  const [year, setYear]         = useState(new Date().getFullYear())
  const [rawExpenses, setRawExpenses] = useState([])
  const [rawIncomes, setRawIncomes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const pieRef   = useRef(null)
  const chartRef = useRef(null)

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
      const [expSnaps, incSnaps] = await Promise.all([
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))))),
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'income'),   where('userId', '==', uid))))),
      ])
      setRawExpenses(expSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
      setRawIncomes(incSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
    setLoading(false)
  }

  /* ── monthly filter ── */
  const m     = String(month + 1).padStart(2, '0')
  const start = `${year}-${m}-01`
  const end   = `${year}-${m}-31`

  const allExp = rawExpenses.filter(e => e.expenseDate >= start && e.expenseDate <= end)
                            .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
  const allInc = rawIncomes.filter(i => i.date >= start && i.date <= end)

  const myExp  = allExp.filter(e => e.userId === me?.id)
  const parExp = partner ? allExp.filter(e => e.userId === partner.id) : []
  const myInc  = allInc.filter(i => i.userId === me?.id)
  const parInc = partner ? allInc.filter(i => i.userId === partner.id) : []

  const shownExp = view === 'meu' ? myExp : view === 'par' ? parExp : allExp
  const shownInc = view === 'meu' ? myInc : view === 'par' ? parInc : allInc

  const totalExp = shownExp.reduce((s, e) => s + Number(e.amount), 0)
  const totalInc = shownInc.reduce((s, i) => s + Number(i.amount), 0)
  const saldo    = totalInc - totalExp

  const myExpTotal  = myExp.reduce((s, e) => s + Number(e.amount), 0)
  const parExpTotal = parExp.reduce((s, e) => s + Number(e.amount), 0)
  const myPct       = Math.round(myExpTotal / (myExpTotal + parExpTotal || 1) * 100)

  const cats = {}
  shownExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount) })
  const pieEntries = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const pieTotal   = pieEntries.reduce((s, [, v]) => s + v, 0) || 1

  /* ── annual data ── */
  const yearStr = String(year)

  function filterView(arr) {
    if (view === 'meu') return arr.filter(x => x.userId === me?.id)
    if (view === 'par') return arr.filter(x => x.userId !== me?.id)
    return arr
  }

  const yearAllExp = filterView(rawExpenses.filter(e => e.expenseDate?.startsWith(yearStr)))
  const yearAllInc = filterView(rawIncomes.filter(i => i.date?.startsWith(yearStr)))

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const mp  = `${yearStr}-${String(i + 1).padStart(2, '0')}`
    return {
      idx:      i,
      expenses: yearAllExp.filter(e => e.expenseDate?.startsWith(mp)).reduce((s, e) => s + Number(e.amount), 0),
      incomes:  yearAllInc.filter(x => x.date?.startsWith(mp)).reduce((s, x) => s + Number(x.amount), 0),
    }
  })

  const yearTotalExp   = monthlyData.reduce((s, d) => s + d.expenses, 0)
  const yearTotalInc   = monthlyData.reduce((s, d) => s + d.incomes,  0)
  const yearSaldo      = yearTotalInc - yearTotalExp
  const monthsWithData = monthlyData.filter(d => d.expenses > 0)
  const maxMonthExp    = Math.max(...monthlyData.map(d => d.expenses), 1)
  const maxMonthIdx    = monthlyData.reduce((mi, d, i) => d.expenses > monthlyData[mi].expenses ? i : mi, 0)
  const minMonthIdx    = monthsWithData.length
    ? monthsWithData.reduce((best, d) => d.expenses < best.expenses ? d : best, monthsWithData[0]).idx
    : -1

  /* ── pie chart ── */
  useEffect(() => {
    if (yearMode || !pieRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (!pieEntries.length) return
    chartRef.current = new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: pieEntries.map(([k]) => k),
        datasets: [{ data: pieEntries.map(([, v]) => v), backgroundColor: pieEntries.map(([k]) => CAT_COLOR[k] || '#888'), borderWidth: 3, borderColor: '#111114', hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmtD(c.raw)} (${Math.round(c.raw / pieTotal * 100)}%)` } } }
      }
    })
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [shownExp, yearMode])

  function chMonth(d) {
    let mo = month + d, y = year
    if (mo > 11) { mo = 0; y++ }
    if (mo < 0)  { mo = 11; y-- }
    setMonth(mo); setYear(y)
  }

  return (
    <PageWrap>
      {/* Header */}
      <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)', color:'var(--tx1)' }}>
            {yearMode ? year : MONTHS[month]}
          </div>
          <div style={{ fontSize:13, color:'var(--tx2)' }}>{yearMode ? 'Visão anual' : year}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {yearMode ? (
            <>
              <MonthBtn onClick={() => setYear(y => y - 1)}>‹</MonthBtn>
              <MonthBtn onClick={() => setYear(y => y + 1)}>›</MonthBtn>
            </>
          ) : (
            <>
              <MonthBtn onClick={() => chMonth(-1)}>‹</MonthBtn>
              <MonthBtn onClick={() => chMonth(1)}>›</MonthBtn>
            </>
          )}
          <button onClick={() => setYearMode(v => !v)}
            style={{ padding:'6px 11px', borderRadius:99, border:'1px solid var(--bd2)', background: yearMode ? 'var(--green-dim)' : 'var(--bg3)', color: yearMode ? 'var(--green)' : 'var(--tx2)', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap' }}>
            {yearMode ? '← Mês' : 'Ano →'}
          </button>
        </div>
      </div>

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      {yearMode ? (
        /* ══ ANNUAL VIEW ══ */
        <>
          <div className="fade-up fade-up-2">
            <MetricGrid>
              <Metric label="Renda"  value={loading ? '…' : fmt(yearTotalInc)} color="var(--green)" />
              <Metric label="Gastos" value={loading ? '…' : fmt(yearTotalExp)} color="var(--red)" />
              <Metric label="Sobrou" value={loading ? '…' : fmt(yearSaldo)} color={yearSaldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
            </MetricGrid>
          </div>

          <div className="fade-up fade-up-3">
            <Card>
              <CardTitle>Gastos por mês</CardTitle>
              {loading ? (
                <div style={{ textAlign:'center', color:'var(--tx3)', padding:'2rem 0' }}>Carregando…</div>
              ) : yearTotalExp === 0 ? (
                <Empty icon="📊" title="Sem dados este ano" sub="Adicione despesas para ver o relatório" />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {monthlyData.map(md => {
                    const isMax = md.expenses > 0 && md.idx === maxMonthIdx
                    const isMin = md.expenses > 0 && md.idx === minMonthIdx
                    const pctW  = Math.round(md.expenses / maxMonthExp * 100)
                    return (
                      <div key={md.idx} onClick={() => { setYearMode(false); setMonth(md.idx) }}
                        style={{ cursor: md.expenses > 0 ? 'pointer' : 'default' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:12, fontWeight:600, width:28, flexShrink:0, color: isMax ? 'var(--red)' : isMin ? 'var(--green)' : 'var(--tx2)' }}>
                            {MONTHS_SHORT[md.idx]}
                          </span>
                          <div style={{ flex:1, height:8, background:'var(--bg4)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pctW}%`, borderRadius:99, transition:'width .4s', background: isMax ? 'var(--red)' : isMin ? 'var(--green)' : 'var(--purple)' }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, minWidth:72, textAlign:'right', color: isMax ? 'var(--red)' : isMin ? 'var(--green)' : 'var(--tx1)' }}>
                            {md.expenses > 0 ? fmtD(md.expenses) : <span style={{ color:'var(--tx3)' }}>—</span>}
                          </span>
                          {isMax && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99, background:'rgba(248,113,113,.12)', color:'var(--red)', flexShrink:0 }}>maior</span>}
                          {isMin && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99, background:'var(--green-dim)', color:'var(--green)', flexShrink:0 }}>menor</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {monthsWithData.length > 0 && (
            <div className="fade-up fade-up-4">
              <Card>
                <CardTitle>Resumo anual</CardTitle>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--red)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Mês mais gasto</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--red)' }}>{MONTHS[maxMonthIdx]}</div>
                    <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>{fmtD(monthlyData[maxMonthIdx].expenses)}</div>
                  </div>
                  {minMonthIdx >= 0 && (
                    <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--green)' }}>
                      <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Mês mais econômico</div>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--green)' }}>{MONTHS[minMonthIdx]}</div>
                      <div style={{ fontSize:12, color:'var(--tx3)', marginTop:2 }}>{fmtD(monthlyData[minMonthIdx].expenses)}</div>
                    </div>
                  )}
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--purple)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Média mensal</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--purple)' }}>
                      {fmtD(yearTotalExp / (monthsWithData.length || 1))}
                    </div>
                  </div>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--amber)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Meses com gastos</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--amber)' }}>{monthsWithData.length} de 12</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        /* ══ MONTHLY VIEW ══ */
        <>
          <div className="fade-up fade-up-2">
            <MetricGrid>
              <Metric label="Renda"  value={loading ? '…' : fmt(totalInc)} color="var(--green)" />
              <Metric label="Gastos" value={loading ? '…' : fmt(totalExp)} color="var(--red)" />
              <Metric label="Sobrou" value={loading ? '…' : fmt(saldo)}    color={saldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
            </MetricGrid>
          </div>

          {view === 'jun' && partner && (
            <div className="fade-up fade-up-2">
              <Card>
                <CardTitle>Participação nos gastos</CardTitle>
                <SplitBar aLabel={me?.name?.split(' ')[0]} aPct={myPct} bLabel={partner?.name?.split(' ')[0]} bPct={100 - myPct} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:14 }}>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'10px 12px', borderLeft:'3px solid var(--green)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{me?.name?.split(' ')[0]}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--green)' }}>{fmt(myExpTotal)}</div>
                  </div>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'10px 12px', borderLeft:'3px solid var(--pink)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{partner?.name?.split(' ')[0]}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--pink)' }}>{fmt(parExpTotal)}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="fade-up fade-up-3">
            <Card>
              <CardTitle>Gastos por categoria</CardTitle>
              {loading ? (
                <div style={{ height:170, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--tx3)' }}>Carregando…</div>
              ) : !pieEntries.length ? (
                <Empty icon="📊" title="Sem despesas" sub="Nenhuma despesa neste período" />
              ) : (
                <>
                  <div style={{ position:'relative', width:170, height:170, margin:'0 auto 1rem' }}>
                    <canvas ref={pieRef} role="img" aria-label="Gráfico pizza por categoria" />
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                      <div style={{ fontSize:11, color:'var(--tx2)' }}>Total</div>
                      <div style={{ fontSize:16, fontWeight:700 }}>{fmt(pieTotal)}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {pieEntries.map(([cat, val]) => (
                      <div key={cat} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:CAT_COLOR[cat]||'#888', flexShrink:0 }} />
                        <span style={{ fontSize:13, flex:1 }}>{CAT_ICON[cat]} {cat}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:CAT_COLOR[cat]||'#888' }}>{Math.round(val/pieTotal*100)}%</span>
                        <span style={{ fontSize:12, color:'var(--tx2)', minWidth:70, textAlign:'right' }}>{fmtD(val)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="fade-up fade-up-4">
            <Card>
              <CardTitle action={<button onClick={() => onNav('expenses')} style={{ fontSize:12, color:'var(--green)', fontWeight:500 }}>ver todas →</button>}>
                Últimas despesas
              </CardTitle>
              {loading ? <div style={{ color:'var(--tx3)', fontSize:14, textAlign:'center', padding:'1rem' }}>Carregando…</div>
                : !shownExp.length ? <Empty icon="🎉" title="Nenhuma despesa!" sub="Toque em + para adicionar" />
                : shownExp.slice(0, 6).map(e => <ExpRow key={e.id} e={e} me={me} partner={partner} />)}
            </Card>
          </div>
        </>
      )}
    </PageWrap>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:34, height:34, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
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
        {CAT_ICON[e.category]||'💸'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</div>
        <div style={{ fontSize:11, color:col, marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
          {e.category}
          {e.isShared && <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:'var(--purple-dim,rgba(167,139,250,0.12))', color:'var(--purple)' }}>casal</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>−{fmtD(e.amount)}</div>
        <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{d}</div>
      </div>
    </div>
  )
}
