import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { PageWrap, Card, CardTitle, Seg, Modal, Field, Input, Select, Row2, ModalActions, Fab, Empty, fmtD, CAT_COLOR, CAT_ICON, CATEGORIES, todayStr } from '../components/UI'
import { ExpRow } from './HomePage'

export default function ExpensesPage({ me, partner }) {
  const [view, setView] = useState('meu')
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ desc:'', amount:'', date:todayStr(), cat:'Alimentação', shared:false })

  const viewOpts = [
    { value:'meu', label: me?.name?.split(' ')[0] || 'Minhas' },
    { value:'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value:'tod', label: 'Todas' },
  ]

  useEffect(() => { load() }, [month, year, me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    const uids = [me.id]; if (partner) uids.push(partner.id)
    const m = String(month + 1).padStart(2, '0')
    const { data } = await supabase.from('expenses').select('*')
      .in('user_id', uids).gte('expense_date', `${year}-${m}-01`).lte('expense_date', `${year}-${m}-31`)
      .order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const shown = view === 'meu' ? expenses.filter(e => e.user_id === me?.id)
    : view === 'par' ? expenses.filter(e => e.user_id !== me?.id)
    : expenses

  async function save() {
    if (!form.desc || !form.amount) { toast.error('Preencha descrição e valor'); return }
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      user_id: me.id, description: form.desc, amount: Number(form.amount),
      category: form.cat, expense_date: form.date, is_shared: form.shared
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Despesa salva! 💸')
      setModal(false)
      setForm({ desc:'', amount:'', date:todayStr(), cat:'Alimentação', shared:false })
      load()
    }
    setSaving(false)
  }

  const total = shown.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <PageWrap>
      <div className="fade-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)' }}>Despesas</div>
          <div style={{ fontSize:13, color:'var(--tx2)' }}>Total: <b style={{color:'var(--red)'}}>{fmtD(total)}</b></div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <MonthBtn onClick={() => { let m=month-1,y=year; if(m<0){m=11;y--} setMonth(m);setYear(y) }}>‹</MonthBtn>
          <div style={{ fontSize:12, color:'var(--tx2)', display:'flex', alignItems:'center', padding:'0 4px' }}>{String(month+1).padStart(2,'0')}/{year}</div>
          <MonthBtn onClick={() => { let m=month+1,y=year; if(m>11){m=0;y++} setMonth(m);setYear(y) }}>›</MonthBtn>
        </div>
      </div>

      <div className="fade-up fade-up-1">
        <Seg options={viewOpts} value={view} onChange={setView} />
      </div>

      <div className="fade-up fade-up-2">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
        ) : !shown.length ? (
          <Empty icon="✨" title="Sem despesas" sub="Toque em + para adicionar" />
        ) : (
          <Card>
            {shown.map(e => <ExpRow key={e.id} e={e} me={me} partner={partner} />)}
          </Card>
        )}
      </div>

      <Fab onClick={() => setModal(true)} />

      <Modal open={modal} onClose={() => setModal(false)} title="Nova despesa">
        <Field label="Descrição">
          <Input value={form.desc} onChange={e => setForm(f=>({...f,desc:e.target.value}))} placeholder="Ex: Supermercado" />
        </Field>
        <Row2>
          <Field label="Valor (R$)">
            <Input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0,00" />
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
          </Field>
        </Row2>
        <Field label="Categoria">
          <Select value={form.cat} onChange={e => setForm(f=>({...f,cat:e.target.value}))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, marginBottom:8, cursor:'pointer' }}>
          <input type="checkbox" checked={form.shared} onChange={e => setForm(f=>({...f,shared:e.target.checked}))}
            style={{ width:18, height:18, accentColor:'var(--green)' }} />
          Despesa compartilhada do casal
        </label>
        <ModalActions onCancel={() => setModal(false)} onSave={save} loading={saving} />
      </Modal>
    </PageWrap>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}
