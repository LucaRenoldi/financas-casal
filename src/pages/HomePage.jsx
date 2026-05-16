import { useState, useEffect, useRef } from 'react'
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js'
import { supabase } from '../lib/supabase'
import { PageWrap, Card, CardTitle, MetricGrid, Metric, Seg, SplitBar, Empty, fmt, fmtD, pct, CAT_COLOR, CAT_ICON, MONTHS } from '../components/UI'

Chart.register(ArcElement, DoughnutController, Tooltip, Legend)

const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function HomePage({ me, partner, onNav }) {
  const [view, setView] = useState('meu')
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const pieRef = useRef(null)
  const chartRef = useRef(null)

  const viewOpts = [
    { value: 'meu', label: me?.name?.split(' ')[0] || 'Meu' },
    { value: 'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value: 'jun', label: 'Juntos' },
  ]

  useEffect(() => { loadExpenses() }, [month, year, me, partner])

  async function loadExpenses() {
    if (!me) return
    setLoading(true)
    const uids = [me.id]
    if (partner) uids.push(partner.id)
    const m = String(month + 1).padStart(2, '0')
    const { data } = await supabase.from('expenses').select('*')
      .in('user_id', uids)
      .gte('expense_date', `${year}-${m}-01`)
      .lte('expense_date', `${year}-${m}-31`)
      .order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const myExp = expenses.filter(e => e.user_id === me?.id)
  const parExp = partner ? expenses.filter(e => e.user_id === partner.id) : []
  const shownExp = view === 'meu' ? myExp : view === 'par' ? parExp : expenses

  const total = shownExp.reduce((s, e) => s + Number(e.amount), 0)
  const myTotal = myExp.reduce((s, e) => s + Number(e.amount), 0)
  const parTotal = parExp.reduce((s, e) => s + Number(e.amount), 0)
  const coupleTotal = myTotal + parTotal || 1
  const myPct = Math.round(myTotal / coupleTotal * 100)

  // Pie chart
  const cats = {}
  shownExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount) })
  const pieEntries = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const pieTotal = pieEntries.reduce((s, [, v]) => s + v, 0) || 1

  useEffect(() => {
    if (!pieRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }
    if (!pieEntries.length) return
    chartRef.current = new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: pieEntries.map(([k]) => k),
        datasets: [{
          data: pieEntries.map(([, v]) => v),
          backgroundColor: pieEntries.map(([k]) => CAT_COLOR[k] || '#888'),
          borderWidth: 3,
          borderColor: '#111114',
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${fmtD(c.raw)} (${Math.round(c.raw / pieTotal * 100)}%)` } }
        }
      }
    })
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [shownExp])

  function chMonth(d) {
    let m = month + d, y = year
    if (m > 11) { m = 0; y++ }
    if (m < 0) { m = 11; y-- }
    setMonth(m); setYear(y)
  }

  return (
    <PageWrap>
      {/* Month nav */}
      <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)', color:'var(--tx1)' }}>
            {MONTHS[month]}
          </div>
          <div style={{ fontSize:13, color:'var(--tx2)' }}>{year}</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <MonthBtn onClick={() => chMonth(-1)}>‹</MonthBtn>
          <MonthBtn onClick={() => chMonth(1)}>›</MonthBtn>
        </div>
      </div>

      {/* View toggle */}
      <div className="fade-up fade-up-1">
        <Seg options={viewOpts} value={view} onChange={setView} />
      </div>

      {/* Metrics */}
      <div className="fade-up fade-up-2">
        <MetricGrid>
          <Metric label="Renda" value="—" color="var(--green)" />
          <Metric label="Gastos" value={loading ? '…' : fmt(total)} color="var(--red)" />
          <Metric label="Sobrou" value="—" color="var(--purple)" />
        </MetricGrid>
      </div>

      {/* Split bar (juntos only) */}
      {view === 'jun' && partner && (
        <div className="fade-up fade-up-2">
          <Card>
            <CardTitle>Participação no mês</CardTitle>
            <SplitBar
              aLabel={me?.name?.split(' ')[0]} aPct={myPct}
              bLabel={partner?.name?.split(' ')[0]} bPct={100 - myPct}
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:14 }}>
              <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'10px 12px', borderLeft:'3px solid var(--green)' }}>
                <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{me?.name?.split(' ')[0]}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--green)' }}>{fmt(myTotal)}</div>
              </div>
              <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'10px 12px', borderLeft:'3px solid var(--pink)' }}>
                <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{partner?.name?.split(' ')[0]}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--pink)' }}>{fmt(parTotal)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Pie chart */}
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

      {/* Recent expenses */}
      <div className="fade-up fade-up-4">
        <Card>
          <CardTitle action={
            <button onClick={() => onNav('expenses')} style={{ fontSize:12, color:'var(--green)', fontWeight:500 }}>ver todas →</button>
          }>Últimas despesas</CardTitle>
          {loading ? <div style={{ color:'var(--tx3)', fontSize:14, textAlign:'center', padding:'1rem' }}>Carregando…</div>
            : !shownExp.length ? <Empty icon="🎉" title="Nenhuma despesa!" sub="Toque em + para adicionar" />
            : shownExp.slice(0, 6).map(e => <ExpRow key={e.id} e={e} me={me} partner={partner} />)}
        </Card>
      </div>
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
  const isMe = e.user_id === me?.id
  const col = isMe ? 'var(--green)' : 'var(--pink)'
  const who = isMe ? me : partner
  const d = new Date(e.expense_date + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 0', borderBottom:'1px solid var(--bd)' }}>
      <div style={{ width:38, height:38, borderRadius:'var(--r-sm)', background:`${CAT_COLOR[e.category]||'#888'}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>
        {CAT_ICON[e.category]||'💸'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description}</div>
        <div style={{ fontSize:11, color:col, marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
          {e.category}
          {e.is_shared && <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:'var(--purple-dim,rgba(167,139,250,0.12))', color:'var(--purple)' }}>casal</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>−{fmtD(e.amount)}</div>
        <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{d}</div>
      </div>
    </div>
  )
}
