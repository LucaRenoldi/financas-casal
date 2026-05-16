import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import { PageWrap, Card, Seg, Modal, Field, Input, Select, Row2, ModalActions, Fab, Empty, fmtD, CAT_COLOR, CAT_ICON, CATEGORIES, todayStr, DatePicker } from '../components/UI'
import { ExpRow } from './HomePage'

const EMPTY_FORM = { desc:'', amount:'', date:todayStr(), cat:'Alimentação', shared:false, isInstallment:false, installments:'2' }

function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1 + n, d)
  if (date.getDate() !== d) date.setDate(0)
  return date.toISOString().split('T')[0]
}

export default function ExpensesPage({ me, partner }) {
  const [view, setView]       = useState('meu')
  const [month, setMonth]     = useState(new Date().getMonth())
  const [year, setYear]       = useState(new Date().getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(EMPTY_FORM)

  const viewOpts = [
    { value:'meu', label: me?.name?.split(' ')[0] || 'Minhas' },
    { value:'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value:'tod', label: 'Todas' },
  ]

  useEffect(() => { load() }, [month, year, me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    try {
      const m     = String(month + 1).padStart(2, '0')
      const start = `${year}-${m}-01`
      const end   = `${year}-${m}-31`
      const queries = [getDocs(query(collection(db, 'expenses'), where('userId', '==', me.id)))]
      if (partner) queries.push(getDocs(query(collection(db, 'expenses'), where('userId', '==', partner.id))))
      const snaps = await Promise.all(queries)
      const data = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
        .filter(e => e.expenseDate >= start && e.expenseDate <= end)
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
      setExpenses(data)
    } catch (err) {
      console.error('Erro ao carregar despesas:', err)
    }
    setLoading(false)
  }

  const shown = view === 'meu' ? expenses.filter(e => e.userId === me?.id)
    : view === 'par' ? expenses.filter(e => e.userId !== me?.id)
    : expenses

  function closeModal() { setModal(false); setForm(EMPTY_FORM) }

  async function save() {
    if (!me) { toast.error('Perfil não carregado, recarregue a página'); return }
    if (!form.desc || !form.amount) { toast.error('Preencha descrição e valor'); return }
    setSaving(true)
    try {
      if (form.isInstallment) {
        const count = parseInt(form.installments) || 2
        if (count < 2 || count > 60) { toast.error('Parcelas: entre 2 e 60'); setSaving(false); return }
        const groupId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
        await Promise.all(Array.from({ length: count }, (_, i) =>
          addDoc(collection(db, 'expenses'), {
            userId: me.id, description: form.desc, amount: Number(form.amount),
            category: form.cat, expenseDate: addMonths(form.date, i), isShared: form.shared,
            isInstallment: true, installmentGroupId: groupId,
            installmentNumber: i + 1, installmentCount: count,
            createdAt: new Date().toISOString(),
          })
        ))
        toast.success(`${count} parcelas registradas! 💳`)
      } else {
        await addDoc(collection(db, 'expenses'), {
          userId: me.id, description: form.desc, amount: Number(form.amount),
          category: form.cat, expenseDate: form.date, isShared: form.shared,
          createdAt: new Date().toISOString(),
        })
        toast.success('Despesa salva! 💸')
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(err.message)
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

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      <div className="fade-up fade-up-2">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
        ) : !shown.length ? (
          <Empty icon="✨" title="Sem despesas" sub="Toque em + para adicionar" />
        ) : (
          <Card>{shown.map(e => <ExpRow key={e.id} e={e} me={me} partner={partner} />)}</Card>
        )}
      </div>

      <Fab onClick={() => setModal(true)} />

      <Modal open={modal} onClose={closeModal} title="Nova despesa">
        <Field label="Descrição">
          <Input value={form.desc} onChange={e => setForm(f=>({...f,desc:e.target.value}))} placeholder="Ex: Supermercado" />
        </Field>
        <Row2>
          <Field label="Valor por parcela (R$)">
            <Input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0,00" />
          </Field>
          <Field label="Data 1ª parcela">
            <DatePicker value={form.date} onChange={d => setForm(f=>({...f,date:d}))} />
          </Field>
        </Row2>
        <Field label="Categoria">
          <Select value={form.cat} onChange={e => setForm(f=>({...f,cat:e.target.value}))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>

        <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, marginBottom:form.isInstallment ? 10 : 8, cursor:'pointer' }}>
          <input type="checkbox" checked={form.isInstallment} onChange={e => setForm(f=>({...f,isInstallment:e.target.checked}))} style={{ width:18, height:18, accentColor:'var(--purple)' }} />
          <span>Compra parcelada <span style={{ color:'var(--purple)' }}>💳</span></span>
        </label>

        {form.isInstallment && (
          <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px 14px', marginBottom:12, border:'1px solid rgba(167,139,250,.2)' }}>
            <Field label="Número de parcelas">
              <Input type="number" inputMode="numeric" value={form.installments}
                onChange={e => setForm(f=>({...f,installments:e.target.value}))}
                placeholder="Ex: 12" min="2" max="60" />
            </Field>
            {form.amount && Number(form.installments) >= 2 && (
              <div style={{ fontSize:12, color:'var(--tx2)', marginTop:6, lineHeight:1.7 }}>
                Valor por mês: <b style={{ color:'var(--purple)' }}>{fmtD(Number(form.amount))}</b>
                {'  ·  '}
                Total da compra: <b style={{ color:'var(--tx1)' }}>{fmtD(Number(form.amount) * Number(form.installments))}</b>
              </div>
            )}
          </div>
        )}

        <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, marginBottom:8, cursor:'pointer' }}>
          <input type="checkbox" checked={form.shared} onChange={e => setForm(f=>({...f,shared:e.target.checked}))} style={{ width:18, height:18, accentColor:'var(--green)' }} />
          Despesa compartilhada do casal
        </label>

        <ModalActions onCancel={closeModal} onSave={save} loading={saving}
          saveLabel={form.isInstallment ? `Criar ${form.installments || '?'} parcelas` : 'Salvar'} />
      </Modal>
    </PageWrap>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>{children}</button>
  )
}
