import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { PageWrap, Card, CardTitle, Seg, Modal, Field, Input, Select, Row2, ModalActions, ProgressBar, Fab, Empty, fmt, pct, BOX_COLOR, CATEGORIES } from '../components/UI'

const COLORS = [
  { value:'teal', label:'Verde' }, { value:'pink', label:'Rosa' },
  { value:'purple', label:'Roxo' }, { value:'amber', label:'Âmbar' }
]
const BANKS = ['Nubank', 'Itaú']

export default function BoxesPage({ me, partner }) {
  const [view, setView] = useState('meu')
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', bank:'Nubank', color:'teal', current:0, goal:'', couple:false })

  const viewOpts = [
    { value:'meu',  label: me?.name?.split(' ')[0] || 'Minhas' },
    { value:'par',  label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value:'cas',  label: 'Do casal' },
  ]

  useEffect(() => { load() }, [me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    const uids = [me.id]
    if (partner) uids.push(partner.id)
    const { data } = await supabase.from('boxes').select('*').in('user_id', uids).order('created_at')
    setBoxes(data || [])
    setLoading(false)
  }

  const shown = view === 'meu' ? boxes.filter(b => b.user_id === me?.id && !b.is_couple_goal)
    : view === 'par' ? boxes.filter(b => b.user_id !== me?.id && !b.is_couple_goal)
    : boxes.filter(b => b.is_couple_goal)

  async function save() {
    if (!form.name || !form.goal) { toast.error('Preencha nome e meta'); return }
    setSaving(true)
    const { error } = await supabase.from('boxes').insert({
      user_id: me.id, name: form.name, bank: form.bank, color: form.color,
      current_amount: Number(form.current) || 0, goal_amount: Number(form.goal),
      is_couple_goal: form.couple
    })
    if (error) toast.error(error.message)
    else { toast.success('Caixinha criada! 🏦'); setModal(false); setForm({ name:'', bank:'Nubank', color:'teal', current:0, goal:'', couple:false }); load() }
    setSaving(false)
  }

  return (
    <PageWrap>
      <div className="fade-up" style={{ marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:4 }}>Caixinhas</div>
        <div style={{ fontSize:13, color:'var(--tx2)' }}>Seus cofrinhos e objetivos</div>
      </div>

      <div className="fade-up fade-up-1">
        <Seg options={viewOpts} value={view} onChange={setView} />
      </div>

      {loading ? (
        <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
      ) : !shown.length ? (
        <Empty icon="🏦" title="Nenhuma caixinha ainda" sub="Toque no + para criar a primeira" />
      ) : (
        shown.map((b, i) => <BoxCard key={b.id} b={b} i={i} me={me} />)
      )}

      <Fab onClick={() => setModal(true)} />

      <Modal open={modal} onClose={() => setModal(false)} title="Nova caixinha / cofrinho">
        <Field label="Nome">
          <Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Viagem Europa" />
        </Field>
        <Row2>
          <Field label="Banco">
            <Select value={form.bank} onChange={e => setForm(f=>({...f,bank:e.target.value}))}>
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label="Cor">
            <Select value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}>
              {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
        </Row2>
        <Row2>
          <Field label="Valor atual (R$)">
            <Input type="number" inputMode="decimal" value={form.current} onChange={e => setForm(f=>({...f,current:e.target.value}))} placeholder="0,00" />
          </Field>
          <Field label="Meta (R$)">
            <Input type="number" inputMode="decimal" value={form.goal} onChange={e => setForm(f=>({...f,goal:e.target.value}))} placeholder="0,00" />
          </Field>
        </Row2>
        <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, marginBottom:8, cursor:'pointer' }}>
          <input type="checkbox" checked={form.couple} onChange={e => setForm(f=>({...f,couple:e.target.checked}))}
            style={{ width:18, height:18, accentColor:'var(--green)' }} />
          Objetivo do casal 💑
        </label>
        <ModalActions onCancel={() => setModal(false)} onSave={save} loading={saving} />
      </Modal>
    </PageWrap>
  )
}

function BoxCard({ b, i, me }) {
  const isOwn = b.user_id === me?.id
  const col = BOX_COLOR[b.color] || 'var(--green)'
  const p = pct(b.current_amount, b.goal_amount)
  return (
    <div className={`fade-up fade-up-${Math.min(i+2,5)}`}>
      <Card>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:20 }}>{b.bank === 'Nubank' ? '🟣' : '🟠'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
              <span style={{ fontSize:15, fontWeight:600 }}>{b.name}</span>
              {b.is_couple_goal && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'var(--pink-dim)', color:'var(--pink)', fontWeight:600 }}>casal</span>}
            </div>
            <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:8 }}>{b.bank}{!isOwn ? ' · de ' + '👤' : ''}</div>
            <ProgressBar value={p} color={col} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8 }}>
              <span style={{ fontSize:18, fontWeight:700, color:col }}>{fmt(b.current_amount)}</span>
              <span style={{ fontSize:12, color:'var(--tx2)' }}>de {fmt(b.goal_amount)} · <b style={{color:col}}>{p}%</b></span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
