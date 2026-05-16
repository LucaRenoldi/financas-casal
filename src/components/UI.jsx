import { useState, useEffect, useRef } from 'react'

/* ── LAYOUT ── */
export function PageWrap({ children }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.25rem 1.25rem 6rem' }}>
      {children}
    </div>
  )
}

/* ── CARD ── */
export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--bd)',
      borderRadius: 'var(--r)', padding: '1.25rem',
      marginBottom: 12, ...style
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)', textTransform:'uppercase', letterSpacing:'.6px' }}>
        {children}
      </span>
      {action}
    </div>
  )
}

/* ── METRIC ── */
export function MetricGrid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>{children}</div>
}

export function Metric({ label, value, color }) {
  return (
    <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px 10px', border:'1px solid var(--bd)' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--tx2)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:700, color: color || 'var(--tx1)', lineHeight:1.1 }}>{value}</div>
    </div>
  )
}

/* ── SEGMENTED CONTROL ── */
export function Seg({ options, value, onChange }) {
  return (
    <div style={{ display:'flex', background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:3, gap:3, marginBottom:14 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          style={{
            flex:1, padding:'8px 4px', border:'none', borderRadius:8,
            background: value === o.value ? 'var(--bg4)' : 'transparent',
            color: value === o.value ? 'var(--tx1)' : 'var(--tx2)',
            fontSize:13, fontWeight:500,
            transition:'all .15s',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── FAB ── */
export function Fab({ onClick, label = '+' }) {
  return (
    <button onClick={onClick} aria-label="Adicionar"
      style={{
        position:'fixed',
        bottom: 'calc(var(--nav-h) + 16px)',
        right: 'max(20px, calc(50vw - 300px))',
        width:54, height:54,
        background:'var(--green)', color:'#000',
        border:'none', borderRadius:'50%',
        fontSize:24, fontWeight:700,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 0 0 8px var(--green-glow)',
        transition:'transform .15s',
        zIndex:50,
      }}
      onMouseDown={e => e.currentTarget.style.transform='scale(0.92)'}
      onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform='scale(0.92)'}
      onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
    >
      {label}
    </button>
  )
}

/* ── MODAL ── */
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div onClick={e => { if(e.target===e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)', animation:'fadeIn .15s' }}>
      <div style={{ background:'var(--bg2)', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:600, padding:'1.5rem 1.5rem max(1.5rem, env(safe-area-inset-bottom))', animation:'slideUp .25s cubic-bezier(0.16,1,0.3,1)', maxHeight:'90dvh', overflowY:'auto' }}>
        <div style={{ width:36, height:4, background:'var(--bd3)', borderRadius:99, margin:'0 auto 1.25rem' }} />
        <h3 style={{ fontSize:18, fontWeight:600, marginBottom:'1.25rem', color:'var(--tx1)' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

/* ── FORM FIELD ── */
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--tx2)', marginBottom:5, letterSpacing:'.5px', textTransform:'uppercase' }}>{label}</label>}
      {children}
    </div>
  )
}

export function Input({ ...props }) {
  return (
    <input {...props}
      style={{
        width:'100%', padding:'12px 14px', border:'1px solid var(--bd2)',
        borderRadius:'var(--r-sm)', background:'var(--bg3)',
        fontSize:15, color:'var(--tx1)',
        transition:'border-color .15s', ...props.style,
      }}
      onFocus={e => e.target.style.borderColor='var(--green)'}
      onBlur={e => e.target.style.borderColor='var(--bd2)'}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select {...props}
      style={{
        width:'100%', padding:'12px 14px', border:'1px solid var(--bd2)',
        borderRadius:'var(--r-sm)', background:'var(--bg3)',
        fontSize:15, color:'var(--tx1)', ...props.style,
      }}>
      {children}
    </select>
  )
}

export function Row2({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>{children}</div>
}

export function ModalActions({ onCancel, onSave, saveLabel = 'Salvar', loading }) {
  return (
    <div style={{ display:'flex', gap:8, marginTop:16 }}>
      <button onClick={onCancel}
        style={{ flex:1, padding:13, background:'var(--bg3)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500, color:'var(--tx2)' }}>
        Cancelar
      </button>
      <button onClick={onSave} disabled={loading}
        style={{ flex:2, padding:13, background: loading ? 'var(--bg4)' : 'var(--green)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, color: loading ? 'var(--tx2)' : '#000' }}>
        {loading ? 'Salvando…' : saveLabel}
      </button>
    </div>
  )
}

/* ── PROGRESS BAR ── */
export function ProgressBar({ value, color = 'var(--green)', height = 4 }) {
  return (
    <div style={{ height, background:'var(--bg4)', borderRadius:99, overflow:'hidden', marginTop:8 }}>
      <div style={{ height:'100%', width:`${Math.min(100, value)}%`, background:color, borderRadius:99, transition:'width .4s ease' }} />
    </div>
  )
}

/* ── SPLIT BAR ── */
export function SplitBar({ aLabel, aPct, bLabel, bPct, aColor = 'var(--green)', bColor = 'var(--pink)' }) {
  return (
    <div>
      <div style={{ height:10, borderRadius:99, overflow:'hidden', display:'flex', margin:'10px 0' }}>
        <div style={{ width:`${aPct}%`, background:aColor, transition:'width .4s' }} />
        <div style={{ width:`${bPct}%`, background:bColor, transition:'width .4s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--tx2)' }}>
        <span style={{ color:aColor, fontWeight:600 }}>{aLabel} {aPct}%</span>
        <span style={{ color:bColor, fontWeight:600 }}>{bLabel} {bPct}%</span>
      </div>
    </div>
  )
}

/* ── EMPTY STATE ── */
export function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'3rem 1rem', color:'var(--tx2)' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:500, color:'var(--tx1)', marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:13 }}>{sub}</div>}
    </div>
  )
}

/* ── UTILS ── */
export const fmt = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const fmtD = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pct = (c, g) => Math.min(100, Math.round((c / g) * 100))
export const todayStr = () => new Date().toISOString().split('T')[0]

export const CAT_COLOR = {
  'Alimentação':'#00C896','Moradia':'#FF6B9D','Transporte':'#A78BFA',
  'Lazer':'#FBBF24','Saúde':'#F87171','Educação':'#60A5FA',
  'Vestuário':'#FB923C','Outros':'#8888A0'
}
export const CAT_ICON = {
  'Alimentação':'🍔','Moradia':'🏠','Transporte':'🚗',
  'Lazer':'🎬','Saúde':'💊','Educação':'📚','Vestuário':'👗','Outros':'💸'
}
export const BOX_COLOR = { teal:'#00C896', pink:'#FF6B9D', purple:'#A78BFA', amber:'#FBBF24' }
export const CATEGORIES = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Vestuário','Outros']
export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/* ── DATE PICKER ── */
export function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const [rect, setRect] = useState(null)

  const parts   = value ? value.split('-') : []
  const selYear  = parts[0] ? +parts[0] : new Date().getFullYear()
  const selMonth = parts[1] ? +parts[1] : new Date().getMonth() + 1
  const selDay   = parts[2] ? +parts[2] : 0

  const [vY, setVY] = useState(selYear)
  const [vM, setVM] = useState(selMonth)

  const today = new Date()

  const display = value
    ? new Date(value + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Selecionar data'

  function handleOpen() {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setVY(selYear); setVM(selMonth)
    setOpen(true)
  }

  function prevM() { if (vM === 1) { setVM(12); setVY(y => y - 1) } else setVM(m => m - 1) }
  function nextM() { if (vM === 12) { setVM(1);  setVY(y => y + 1) } else setVM(m => m + 1) }

  function pick(day) {
    onChange(`${vY}-${String(vM).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
    setOpen(false)
  }

  const daysInMonth = new Date(vY, vM, 0).getDate()
  const firstDay    = new Date(vY, vM - 1, 1).getDay()
  const showAbove   = rect && (rect.bottom + 320 > window.innerHeight - 20)

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        style={{
          width: '100%', padding: '12px 14px', border: '1px solid var(--bd2)',
          borderRadius: 'var(--r-sm)', background: 'var(--bg3)',
          fontSize: 15, color: value ? 'var(--tx1)' : 'var(--tx3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span>{display}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: .5 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && rect && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
          <div style={{
            position: 'fixed',
            top:  showAbove ? rect.top - 316 : rect.bottom + 6,
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 292)),
            width: Math.max(284, rect.width),
            background: 'var(--bg2)', border: '1px solid var(--bd2)',
            borderRadius: 'var(--r)', padding: 16, zIndex: 150,
            boxShadow: '0 8px 40px rgba(0,0,0,.65)',
            animation: 'scaleIn .15s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button type="button" onClick={prevM} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--bd2)', color: 'var(--tx1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{MONTHS[vM - 1]} {vY}</span>
              <button type="button" onClick={nextM} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--bd2)', color: 'var(--tx1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--tx3)', padding: '3px 0' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {Array(firstDay).fill(null).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1
                const isSel  = d === selDay  && vM === selMonth && vY === selYear
                const isToday = d === today.getDate() && vM === today.getMonth() + 1 && vY === today.getFullYear()
                return (
                  <button key={d} type="button" onClick={() => pick(d)} style={{
                    height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isSel ? 'var(--green)' : isToday ? 'var(--green-dim)' : 'transparent',
                    color: isSel ? '#000' : isToday ? 'var(--green)' : 'var(--tx1)',
                    fontSize: 13, fontWeight: isSel || isToday ? 700 : 400,
                  }}>{d}</button>
                )
              })}
            </div>

            <button type="button"
              onClick={() => { const t = today; onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`); setOpen(false) }}
              style={{ width: '100%', marginTop: 10, padding: '7px', background: 'var(--bg3)', border: '1px solid var(--bd2)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--green)', fontWeight: 600, cursor: 'pointer' }}
            >Hoje</button>
          </div>
        </>
      )}
    </>
  )
}
