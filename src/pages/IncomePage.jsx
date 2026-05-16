import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import { PageWrap, Card, CardTitle, Seg, Modal, Field, Input, Row2, ModalActions, Fab, Empty, fmt, fmtD, todayStr } from '../components/UI'

const SOURCES = ['Salário', 'Freelance', 'Investimentos', 'Aluguel', 'Presente', 'Outros']

const SOURCE_ICON = {
  'Salário': '💼', 'Freelance': '💻', 'Investimentos': '📈',
  'Aluguel': '🏠', 'Presente': '🎁', 'Outros': '💰',
}

const EMPTY_FORM = { source: 'Salário', amount: '', date: todayStr(), note: '' }

export default function IncomePage({ me, partner }) {
  const [view, setView]           = useState('meu')
  const [month, setMonth]         = useState(new Date().getMonth())
  const [year, setYear]           = useState(new Date().getFullYear())
  const [incomes, setIncomes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const viewOpts = [
    { value: 'meu', label: me?.name?.split(' ')[0] || 'Minha' },
    { value: 'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value: 'tod', label: 'Total' },
  ]

  useEffect(() => { load() }, [month, year, me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    try {
      const m     = String(month + 1).padStart(2, '0')
      const start = `${year}-${m}-01`
      const end   = `${year}-${m}-31`
      const queries = [getDocs(query(collection(db, 'income'), where('userId', '==', me.id)))]
      if (partner) queries.push(getDocs(query(collection(db, 'income'), where('userId', '==', partner.id))))
      const snaps = await Promise.all(queries)
      const data = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
        .filter(e => e.date >= start && e.date <= end)
        .sort((a, b) => b.date.localeCompare(a.date))
      setIncomes(data)
    } catch (err) {
      console.error('Erro ao carregar rendas:', err)
      toast.error('Erro ao carregar: ' + err.message)
    }
    setLoading(false)
  }

  const shown = view === 'meu' ? incomes.filter(i => i.userId === me?.id)
    : view === 'par' ? incomes.filter(i => i.userId !== me?.id)
    : incomes

  const total    = shown.reduce((s, i) => s + Number(i.amount), 0)
  const myTotal  = incomes.filter(i => i.userId === me?.id).reduce((s, i) => s + Number(i.amount), 0)
  const parTotal = incomes.filter(i => i.userId !== me?.id).reduce((s, i) => s + Number(i.amount), 0)

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  function openEdit(inc) {
    setEditing(inc)
    setForm({ source: inc.source, amount: inc.amount, date: inc.date, note: inc.note || '' })
    setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null); setForm(EMPTY_FORM) }

  async function save() {
    if (!me) { toast.error('Perfil não carregado'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Preencha o valor'); return }
    setSaving(true)
    try {
      if (editing) {
        const updates = { source: form.source, amount: Number(form.amount), date: form.date, note: form.note }
        await updateDoc(doc(db, 'income', editing.id), updates)
        setIncomes(prev => prev.map(i => i.id === editing.id ? { ...i, ...updates } : i))
        toast.success('Renda atualizada! ✏️')
      } else {
        const newIncome = {
          userId: me.id, source: form.source, amount: Number(form.amount),
          date: form.date, note: form.note, createdAt: new Date().toISOString(),
        }
        const docRef = await addDoc(collection(db, 'income'), newIncome)
        setIncomes(prev => [{ id: docRef.id, ...newIncome }, ...prev])
        setView('meu')
        toast.success('Renda adicionada! 💰')
      }
      closeModal()
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  async function deleteIncome() {
    if (!confirmDelete) return
    try {
      await deleteDoc(doc(db, 'income', confirmDelete.id))
      setIncomes(prev => prev.filter(i => i.id !== confirmDelete.id))
      toast.success('Renda removida')
      setConfirmDelete(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

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
          <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)' }}>Renda</div>
          <div style={{ fontSize:13, color:'var(--tx2)' }}>
            Total: <b style={{ color:'var(--green)' }}>{fmtD(total)}</b>
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <MonthBtn onClick={() => chMonth(-1)}>‹</MonthBtn>
          <div style={{ fontSize:12, color:'var(--tx2)', display:'flex', alignItems:'center', padding:'0 4px' }}>
            {String(month + 1).padStart(2, '0')}/{year}
          </div>
          <MonthBtn onClick={() => chMonth(1)}>›</MonthBtn>
        </div>
      </div>

      {/* View toggle */}
      <div className="fade-up fade-up-1">
        <Seg options={viewOpts} value={view} onChange={setView} />
      </div>

      {/* Summary cards */}
      {partner && (
        <div className="fade-up fade-up-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', border:'1px solid var(--bd)', borderLeft:'3px solid var(--green)' }}>
            <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{me?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--green)' }}>{fmt(myTotal)}</div>
          </div>
          <div style={{ background:'var(--bg3)', borderRadius:'var(--r-sm)', padding:'12px', border:'1px solid var(--bd)', borderLeft:'3px solid var(--pink)' }}>
            <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:4 }}>{partner?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--pink)' }}>{fmt(parTotal)}</div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="fade-up fade-up-3">
        {loading ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
        ) : !shown.length ? (
          <Empty icon="💰" title="Nenhuma renda neste mês" sub="Toque em + para adicionar" />
        ) : (
          <Card style={{ padding:0, overflow:'hidden' }}>
            {shown.map((inc, i) => (
              <IncomeRow
                key={inc.id} inc={inc} me={me}
                isLast={i === shown.length - 1}
                onEdit={() => openEdit(inc)}
                onDelete={() => setConfirmDelete(inc)}
              />
            ))}
          </Card>
        )}
      </div>

      <Fab onClick={openCreate} />

      {/* Create / Edit modal */}
      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar renda' : 'Nova renda'}>
        <Row2>
          <Field label="Origem">
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              style={{ width:'100%', padding:'13px 14px', background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:15, color:'var(--tx1)' }}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>
        </Row2>
        <Field label="Valor (R$)">
          <Input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
        </Field>
        <Field label="Observação (opcional)">
          <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex: 13º salário, bônus…" />
        </Field>
        <ModalActions onCancel={closeModal} onSave={save} loading={saving} saveLabel={editing ? 'Salvar alterações' : 'Adicionar'} />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover renda">
        <p style={{ fontSize:14, color:'var(--tx2)', marginBottom:20, lineHeight:1.6 }}>
          Tem certeza que quer remover a renda de <b style={{ color:'var(--tx1)' }}>{confirmDelete?.source}</b> no valor de <b style={{ color:'var(--green)' }}>{fmtD(confirmDelete?.amount)}</b>?
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:'13px', background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500, color:'var(--tx2)', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={deleteIncome} style={{ flex:1, padding:'13px', background:'var(--red,#f87171)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}>
            Remover
          </button>
        </div>
      </Modal>
    </PageWrap>
  )
}

function IncomeRow({ inc, me, isLast, onEdit, onDelete }) {
  const isOwn = inc.userId === me?.id
  const d = new Date(inc.date + 'T12:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: isLast ? 'none' : '1px solid var(--bd)' }}>
      <div style={{ width:40, height:40, borderRadius:'var(--r-sm)', background:'rgba(0,200,150,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        {SOURCE_ICON[inc.source] || '💰'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{inc.source}</div>
        <div style={{ fontSize:11, color:'var(--tx2)', marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
          <span>{d}</span>
          {inc.note && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>· {inc.note}</span>}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--green)' }}>+{fmtD(inc.amount)}</div>
        {!isOwn && <div style={{ fontSize:10, color:'var(--tx3)', marginTop:2 }}>{inc.userId === me?.id ? 'você' : 'parceiro(a)'}</div>}
      </div>
      {isOwn && (
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          <ActionBtn onClick={onEdit} title="Editar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </ActionBtn>
          <ActionBtn onClick={onDelete} title="Remover" danger>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </ActionBtn>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, children, title, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      width:28, height:28, borderRadius:8, border:'1px solid var(--bd2)',
      background: danger ? 'rgba(248,113,113,0.08)' : 'var(--bg3)',
      color: danger ? 'var(--red,#f87171)' : 'var(--tx2)',
      display:'flex', alignItems:'center', justifyContent:'center',
      cursor:'pointer', transition:'all .15s',
    }}>
      {children}
    </button>
  )
}

function MonthBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width:30, height:30, borderRadius:'50%', border:'1px solid var(--bd2)', background:'var(--bg3)', color:'var(--tx1)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}
