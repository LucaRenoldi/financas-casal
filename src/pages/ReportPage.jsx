import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { PageWrap, Card, CardTitle, Seg, MetricGrid, Metric, Empty, fmt, fmtD, CAT_COLOR, CAT_ICON, MONTHS } from '../components/UI'

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function ReportPage({ me, partner }) {
  const [view, setView]       = useState('meu')
  const [period, setPeriod]   = useState('monthly')
  const [month, setMonth]     = useState(new Date().getMonth())
  const [year, setYear]       = useState(new Date().getFullYear())
  const [rawExpenses, setRawExpenses] = useState([])
  const [rawIncomes, setRawIncomes]   = useState([])
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
      const [expSnaps, incSnaps] = await Promise.all([
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))))),
        Promise.all(uids.map(uid => getDocs(query(collection(db, 'income'),   where('userId', '==', uid))))),
      ])
      setRawExpenses(expSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
      setRawIncomes(incSnaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))))
    } catch (err) {
      console.error('Erro ao carregar relatório:', err)
    }
    setLoading(false)
  }

  function filterView(arr) {
    if (view === 'meu') return arr.filter(x => x.userId === me?.id)
    if (view === 'par') return arr.filter(x => partner && x.userId === partner.id)
    return arr
  }

  /* ── monthly data ── */
  const m     = String(month + 1).padStart(2, '0')
  const start = `${year}-${m}-01`
  const end   = `${year}-${m}-31`

  const shownExp = filterView(rawExpenses.filter(e => e.expenseDate >= start && e.expenseDate <= end))
  const shownInc = filterView(rawIncomes.filter(i => i.date >= start && i.date <= end))

  const totalExp = shownExp.reduce((s, e) => s + Number(e.amount), 0)
  const totalInc = shownInc.reduce((s, i) => s + Number(i.amount), 0)
  const saldo    = totalInc - totalExp
  const savingsRate = totalInc > 0 ? Math.round((saldo / totalInc) * 100) : 0

  /* ── previous month comparison ── */
  const prevM = month === 0 ? 11 : month - 1
  const prevY = month === 0 ? year - 1 : year
  const pm    = String(prevM + 1).padStart(2, '0')
  const prevStart = `${prevY}-${pm}-01`
  const prevEnd   = `${prevY}-${pm}-31`
  const prevExp = filterView(rawExpenses.filter(e => e.expenseDate >= prevStart && e.expenseDate <= prevEnd))
  const prevExpTotal = prevExp.reduce((s, e) => s + Number(e.amount), 0)
  const expChange = prevExpTotal > 0 ? ((totalExp - prevExpTotal) / prevExpTotal * 100) : null

  /* ── categories ── */
  const cats = {}
  shownExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount) })
  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const catTotal   = catEntries.reduce((s, [, v]) => s + v, 0) || 1

  /* ── top expenses ── */
  const topExp = [...shownExp].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5)

  /* ── annual data ── */
  const yearStr = String(year)
  const monthlyRows = Array.from({ length: 12 }, (_, i) => {
    const mp  = `${yearStr}-${String(i + 1).padStart(2, '0')}`
    const inc = filterView(rawIncomes.filter(x => x.date?.startsWith(mp))).reduce((s, x) => s + Number(x.amount), 0)
    const exp = filterView(rawExpenses.filter(e => e.expenseDate?.startsWith(mp))).reduce((s, e) => s + Number(e.amount), 0)
    return { idx: i, income: inc, expense: exp, saldo: inc - exp }
  })
  const yearTotalInc = monthlyRows.reduce((s, r) => s + r.income, 0)
  const yearTotalExp = monthlyRows.reduce((s, r) => s + r.expense, 0)
  const yearSaldo    = yearTotalInc - yearTotalExp
  const yearSavings  = yearTotalInc > 0 ? Math.round((yearSaldo / yearTotalInc) * 100) : 0

  const rowsWithData  = monthlyRows.filter(r => r.expense > 0 || r.income > 0)
  const maxMonthExp   = Math.max(...monthlyRows.map(r => r.expense), 1)
  const bestMonthIdx  = rowsWithData.length ? rowsWithData.reduce((b, r) => r.expense < b.expense ? r : b, rowsWithData[0]).idx : -1
  const worstMonthIdx = monthlyRows.reduce((mi, r, i) => r.expense > monthlyRows[mi].expense ? i : mi, 0)

  function chYear(d) { setYear(y => y + d) }
  function chMonth(d) {
    let mo = month + d, y = year
    if (mo > 11) { mo = 0; y++ }
    if (mo < 0)  { mo = 11; y-- }
    setMonth(mo); setYear(y)
  }

  return (
    <PageWrap>
      {/* Header */}
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

          {period === 'monthly' ? (
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <RoundBtn onClick={() => chMonth(-1)}>‹</RoundBtn>
              <span style={{ fontSize:12, color:'var(--tx2)', minWidth:52, textAlign:'center' }}>
                {String(month + 1).padStart(2,'0')}/{year}
              </span>
              <RoundBtn onClick={() => chMonth(1)}>›</RoundBtn>
            </div>
          ) : (
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <RoundBtn onClick={() => chYear(-1)}>‹</RoundBtn>
              <span style={{ fontSize:13, color:'var(--tx2)', minWidth:36, textAlign:'center', fontWeight:600 }}>{year}</span>
              <RoundBtn onClick={() => chYear(1)}>›</RoundBtn>
            </div>
          )}
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
              }}>{ml}</button>
            ))}
          </div>
        )}
      </div>

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      {period === 'monthly' ? (
        /* ══ MONTHLY REPORT ══ */
        <>
          {/* Summary */}
          <div className="fade-up fade-up-2">
            <MetricGrid>
              <Metric label="Receita" value={loading ? '…' : fmt(totalInc)} color="var(--green)" />
              <Metric label="Gastos"  value={loading ? '…' : fmt(totalExp)} color="var(--red)" />
              <Metric label="Saldo"   value={loading ? '…' : fmt(saldo)}    color={saldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
            </MetricGrid>
          </div>

          {/* Savings rate + month comparison */}
          {!loading && (totalInc > 0 || totalExp > 0) && (
            <div className="fade-up fade-up-2">
              <Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--purple)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Taxa de poupança</div>
                    <div style={{ fontSize:20, fontWeight:700, color: savingsRate >= 0 ? 'var(--purple)' : 'var(--red)' }}>{savingsRate}%</div>
                    <div style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>da renda guardada</div>
                  </div>
                  {expChange !== null && (
                    <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:`3px solid ${expChange <= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                      <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>vs {MONTHS_SHORT[prevM]}</div>
                      <div style={{ fontSize:20, fontWeight:700, color: expChange <= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {expChange > 0 ? '+' : ''}{Math.round(expChange)}%
                      </div>
                      <div style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>nos gastos</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Category breakdown */}
          {!loading && catEntries.length > 0 && (
            <div className="fade-up fade-up-3">
              <Card>
                <CardTitle>Gastos por categoria</CardTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {catEntries.map(([cat, val]) => {
                    const pct = Math.round(val / catTotal * 100)
                    return (
                      <div key={cat}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                            <span>{CAT_ICON[cat] || '📦'}</span>
                            <span>{cat}</span>
                          </span>
                          <span style={{ fontSize:12, color:'var(--tx2)' }}>
                            <b style={{ color:CAT_COLOR[cat]||'#888' }}>{pct}%</b>
                            {' · '}{fmtD(val)}
                          </span>
                        </div>
                        <div style={{ height:5, background:'var(--bg4)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:CAT_COLOR[cat]||'#888', transition:'width .4s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Top expenses */}
          {!loading && topExp.length > 0 && (
            <div className="fade-up fade-up-4">
              <Card>
                <CardTitle>Maiores despesas</CardTitle>
                {topExp.map((e, i) => {
                  const d = new Date(e.expenseDate + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i < topExp.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--tx3)', flexShrink:0 }}>
                        {i + 1}
                      </div>
                      <div style={{ width:34, height:34, borderRadius:'var(--r-sm)', background:`${CAT_COLOR[e.category]||'#888'}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                        {CAT_ICON[e.category] || '💸'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                        <div style={{ fontSize:11, color:'var(--tx2)', marginTop:1 }}>{e.category} · {d}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--red)', flexShrink:0 }}>−{fmtD(e.amount)}</div>
                    </div>
                  )
                })}
              </Card>
            </div>
          )}

          {!loading && !shownExp.length && !shownInc.length && (
            <Empty icon="📋" title={`Sem dados em ${MONTHS[month]}`} sub="Adicione entradas e despesas para ver o relatório" />
          )}
        </>
      ) : (
        /* ══ ANNUAL REPORT ══ */
        <>
          {/* Annual summary */}
          <div className="fade-up fade-up-2">
            <MetricGrid>
              <Metric label="Receita" value={loading ? '…' : fmt(yearTotalInc)} color="var(--green)" />
              <Metric label="Gastos"  value={loading ? '…' : fmt(yearTotalExp)} color="var(--red)" />
              <Metric label="Saldo"   value={loading ? '…' : fmt(yearSaldo)}    color={yearSaldo >= 0 ? 'var(--purple)' : 'var(--red)'} />
            </MetricGrid>
          </div>

          {/* Annual highlights */}
          {!loading && rowsWithData.length > 0 && (
            <div className="fade-up fade-up-2">
              <Card>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--red)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Mês mais gasto</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--red)' }}>{MONTHS_SHORT[worstMonthIdx]}</div>
                    <div style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>{fmtD(monthlyRows[worstMonthIdx].expense)}</div>
                  </div>
                  {bestMonthIdx >= 0 && (
                    <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--green)' }}>
                      <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Mês mais econômico</div>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--green)' }}>{MONTHS_SHORT[bestMonthIdx]}</div>
                      <div style={{ fontSize:11, color:'var(--tx3)', marginTop:2 }}>{fmtD(monthlyRows[bestMonthIdx].expense)}</div>
                    </div>
                  )}
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--purple)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Taxa de poupança</div>
                    <div style={{ fontSize:15, fontWeight:700, color: yearSavings >= 0 ? 'var(--purple)' : 'var(--red)' }}>{yearSavings}%</div>
                  </div>
                  <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', borderLeft:'3px solid var(--amber)' }}>
                    <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>Média mensal gasto</div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--amber)' }}>
                      {fmtD(yearTotalExp / (rowsWithData.length || 1))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Month by month table */}
          {!loading && (
            <div className="fade-up fade-up-3">
              <Card style={{ padding:0, overflow:'hidden' }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:4, padding:'10px 14px', background:'var(--bg3)', borderBottom:'1px solid var(--bd)' }}>
                  {['Mês','Receita','Gastos','Saldo'].map(h => (
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:'var(--tx3)', textTransform:'uppercase', letterSpacing:'.5px', textAlign: h === 'Mês' ? 'left' : 'right' }}>{h}</div>
                  ))}
                </div>
                {monthlyRows.map((r, i) => {
                  const isEmpty = r.income === 0 && r.expense === 0
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:4, padding:'10px 14px', borderBottom: i < 11 ? '1px solid var(--bd)' : 'none', opacity: isEmpty ? 0.4 : 1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--tx2)' }}>{MONTHS_SHORT[r.idx]}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--green)', textAlign:'right' }}>{r.income > 0 ? fmt(r.income) : '—'}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--red)',   textAlign:'right' }}>{r.expense > 0 ? fmt(r.expense) : '—'}</div>
                      <div style={{ fontSize:12, fontWeight:700, color: r.saldo >= 0 ? 'var(--purple)' : 'var(--red)', textAlign:'right' }}>
                        {!isEmpty ? (r.saldo >= 0 ? '+' : '') + fmt(r.saldo) : '—'}
                      </div>
                    </div>
                  )
                })}
                {/* Totals row */}
                {rowsWithData.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:4, padding:'10px 14px', background:'var(--bg3)', borderTop:'2px solid var(--bd2)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--tx1)' }}>Total</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--green)', textAlign:'right' }}>{fmt(yearTotalInc)}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--red)',   textAlign:'right' }}>{fmt(yearTotalExp)}</div>
                    <div style={{ fontSize:12, fontWeight:700, color: yearSaldo >= 0 ? 'var(--purple)' : 'var(--red)', textAlign:'right' }}>
                      {yearSaldo >= 0 ? '+' : ''}{fmt(yearSaldo)}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {!loading && rowsWithData.length === 0 && (
            <Empty icon="📊" title={`Sem dados em ${year}`} sub="Adicione entradas e despesas para ver o relatório" />
          )}
        </>
      )}
    </PageWrap>
  )
}

function RoundBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
      {children}
    </button>
  )
}
