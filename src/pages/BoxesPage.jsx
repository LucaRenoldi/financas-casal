import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import { PageWrap, Card, Seg, Modal, Field, Input, Select, Row2, ModalActions, ProgressBar, Fab, Empty, fmt, pct, BOX_COLOR } from '../components/UI'

const COLORS = [
  { value:'teal', label:'Verde' }, { value:'pink', label:'Rosa' },
  { value:'purple', label:'Roxo' }, { value:'amber', label:'Âmbar' },
]
const BANKS = ['Nubank', 'Itaú']
const EMPTY_FORM = { name:'', bank:'Nubank', color:'teal', current:0, goal:'', couple:false }

export default function BoxesPage({ me, partner }) {
  const [view, setView] = useState('meu')
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null) // box being edited or null
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null) // box to delete

  const viewOpts = [
    { value:'meu', label: me?.name?.split(' ')[0] || 'Minhas' },
    { value:'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value:'cas', label: 'Do casal' },
  ]

  useEffect(() => { load() }, [me, partner])

  async function load() {
    if (!me) return
    setLoading(true)
    try {
      const queries = [getDocs(query(collection(db, 'boxes'), where('userId', '==', me.id)))]
      if (partner) queries.push(getDocs(query(collection(db, 'boxes'), where('userId', '==', partner.id))))
      const snaps = await Promise.all(queries)
      const data = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
      setBoxes(data.sort((a, b) => a.createdAt?.localeCompare(b.createdAt)))
    } catch (err) {
      console.error('Erro ao carregar caixinhas:', err)
      toast.error('Erro ao carregar: ' + err.message)
    }
    setLoading(false)
  }

  const shown = view === 'meu' ? boxes.filter(b => b.userId === me?.id && !b.isCoupleGoal)
    : view === 'par' ? boxes.filter(b => b.userId !== me?.id && !b.isCoupleGoal)
    : boxes.filter(b => b.isCoupleGoal)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(b) {
    setEditing(b)
    setForm({ name: b.name, bank: b.bank, color: b.color, current: b.currentAmount, goal: b.goalAmount, couple: b.isCoupleGoal })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function save() {
    if (!me) { toast.error('Perfil não carregado, recarregue a página'); return }
    if (!form.name || !form.goal) { toast.error('Preencha nome e meta'); return }
    setSaving(true)
    try {
      if (editing) {
        // Editar existente
        const updates = {
          name: form.name, bank: form.bank, color: form.color,
          currentAmount: Number(form.current) || 0, goalAmount: Number(form.goal),
          isCoupleGoal: form.couple,
        }
        await updateDoc(doc(db, 'boxes', editing.id), updates)
        setBoxes(prev => prev.map(b => b.id === editing.id ? { ...b, ...updates } : b))
        toast.success('Caixinha atualizada! ✏️')
      } else {
        // Criar nova
        const newBox = {
          userId: me.id, name: form.name, bank: form.bank, color: form.color,
          currentAmount: Number(form.current) || 0, goalAmount: Number(form.goal),
          isCoupleGoal: form.couple, createdAt: new Date().toISOString(),
        }
        const docRef = await addDoc(collection(db, 'boxes'), newBox)
        setBoxes(prev => [...prev, { id: docRef.id, ...newBox }])
        if (form.couple) setView('cas')
        else setView('meu')
        toast.success('Caixinha criada! 🏦')
      }
      closeModal()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      toast.error(err.message)
    }
    setSaving(false)
  }

  async function deleteBox() {
    if (!confirmDelete) return
    try {
      await deleteDoc(doc(db, 'boxes', confirmDelete.id))
      setBoxes(prev => prev.filter(x => x.id !== confirmDelete.id))
      toast.success('Caixinha deletada')
      setConfirmDelete(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <PageWrap>
      <div className="fade-up" style={{ marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:4 }}>Caixinhas</div>
        <div style={{ fontSize:13, color:'var(--tx2)' }}>Seus cofrinhos e objetivos</div>
      </div>

      <div className="fade-up fade-up-1"><Seg options={viewOpts} value={view} onChange={setView} /></div>

      {loading ? (
        <div style={{ padding:'2rem', textAlign:'center', color:'var(--tx3)' }}>Carregando…</div>
      ) : !shown.length ? (
        <Empty icon="🏦" title="Nenhuma caixinha ainda" sub="Toque no + para criar a primeira" />
      ) : (
        shown.map((b, i) => (
          <BoxCard key={b.id} b={b} i={i} me={me}
            onEdit={() => openEdit(b)}
            onDelete={() => setConfirmDelete(b)}
          />
        ))
      )}

      <Fab onClick={openCreate} />

      <Modal open={modal} onClose={closeModal} title={editing ? 'Editar caixinha' : 'Nova caixinha / cofrinho'}>
        <Field label="Nome"><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Viagem Europa" /></Field>
        <Row2>
          <Field label="Banco"><Select value={form.bank} onChange={e => setForm(f=>({...f,bank:e.target.value}))}>{BANKS.map(b => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Cor"><Select value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))}>{COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
        </Row2>
        <Row2>
          <Field label="Valor atual (R$)"><Input type="number" inputMode="decimal" value={form.current} onChange={e => setForm(f=>({...f,current:e.target.value}))} placeholder="0,00" /></Field>
          <Field label="Meta (R$)"><Input type="number" inputMode="decimal" value={form.goal} onChange={e => setForm(f=>({...f,goal:e.target.value}))} placeholder="0,00" /></Field>
        </Row2>
        <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, marginBottom:8, cursor:'pointer' }}>
          <input type="checkbox" checked={form.couple} onChange={e => setForm(f=>({...f,couple:e.target.checked}))} style={{ width:18, height:18, accentColor:'var(--green)' }} />
          Objetivo do casal 💑
        </label>
        <ModalActions onCancel={closeModal} onSave={save} loading={saving} saveLabel={editing ? 'Salvar alterações' : 'Criar'} />
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deletar caixinha">
        <p style={{ fontSize:14, color:'var(--tx2)', marginBottom:20, lineHeight:1.6 }}>
          Tem certeza que quer deletar <b style={{ color:'var(--tx1)' }}>"{confirmDelete?.name}"</b>? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:'13px', background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500, color:'var(--tx2)', cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={deleteBox} style={{ flex:1, padding:'13px', background:'var(--red,#f87171)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}>
            Deletar
          </button>
        </div>
      </Modal>
    </PageWrap>
  )
}

function BoxCard({ b, i, me, onEdit, onDelete }) {
  const isOwn = b.userId === me?.id
  const col   = BOX_COLOR[b.color] || 'var(--green)'
  const p     = pct(b.currentAmount, b.goalAmount)
  return (
    <div className={`fade-up fade-up-${Math.min(i+2,5)}`}>
      <Card>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:20 }}>{b.bank === 'Nubank' ? '🟣' : '🟠'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15, fontWeight:600 }}>{b.name}</span>
                {b.isCoupleGoal && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'var(--pink-dim)', color:'var(--pink)', fontWeight:600 }}>casal</span>}
              </div>
              {isOwn && (
                <div style={{ display:'flex', gap:4 }}>
                  <ActionBtn onClick={onEdit} title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </ActionBtn>
                  <ActionBtn onClick={onDelete} title="Deletar" danger>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </ActionBtn>
                </div>
              )}
            </div>
            <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:8 }}>{b.bank}</div>
            <ProgressBar value={p} color={col} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8 }}>
              <span style={{ fontSize:18, fontWeight:700, color:col }}>{fmt(b.currentAmount)}</span>
              <span style={{ fontSize:12, color:'var(--tx2)' }}>de {fmt(b.goalAmount)} · <b style={{color:col}}>{p}%</b></span>
            </div>
          </div>
        </div>
      </Card>
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
