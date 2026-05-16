import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import { PageWrap, Card, Seg, Modal, Field, Input, Select, Row2, ModalActions, ProgressBar, Fab, Empty, fmt, fmtD, pct, BOX_COLOR, MONTHS } from '../components/UI'

const COLORS = [
  { value:'teal', label:'Verde' }, { value:'pink', label:'Rosa' },
  { value:'purple', label:'Roxo' }, { value:'amber', label:'Âmbar' },
]
const BANKS = ['Nubank', 'Itaú']
const EMPTY_FORM = { name:'', bank:'Nubank', color:'teal', current:0, goal:'', couple:false }

export default function BoxesPage({ me, partner }) {
  const [view, setView]               = useState('meu')
  const [boxes, setBoxes]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [txModal, setTxModal]   = useState({ open: false, box: null, type: 'deposit' })
  const [txAmount, setTxAmount] = useState('')
  const [txSaving, setTxSaving] = useState(false)

  const [histModal, setHistModal]   = useState({ open: false, box: null })
  const [histTx, setHistTx]         = useState([])
  const [histLoading, setHistLoading] = useState(false)

  const viewOpts = [
    { value:'meu', label: me?.name?.split(' ')[0] || 'Minhas' },
    { value:'par', label: partner?.name?.split(' ')[0] || 'Parceiro(a)' },
    { value:'cas', label: 'Casal' },
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
      toast.error('Erro ao carregar: ' + err.message)
    }
    setLoading(false)
  }

  /* caixinhas do casal aparecem em todas as abas */
  const shown = view === 'meu'
    ? boxes.filter(b => b.userId === me?.id || b.isCoupleGoal)
    : view === 'par'
    ? boxes.filter(b => (partner && b.userId === partner.id) || b.isCoupleGoal)
    : boxes.filter(b => b.isCoupleGoal)

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  function openEdit(b) {
    setEditing(b)
    setForm({ name: b.name, bank: b.bank, color: b.color, current: b.currentAmount, goal: b.goalAmount, couple: b.isCoupleGoal })
    setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null); setForm(EMPTY_FORM) }

  async function save() {
    if (!me) { toast.error('Perfil não carregado, recarregue a página'); return }
    if (!form.name || !form.goal) { toast.error('Preencha nome e meta'); return }
    setSaving(true)
    try {
      if (editing) {
        const updates = {
          name: form.name, bank: form.bank, color: form.color,
          currentAmount: Number(form.current) || 0, goalAmount: Number(form.goal),
          isCoupleGoal: form.couple,
        }
        await updateDoc(doc(db, 'boxes', editing.id), updates)
        setBoxes(prev => prev.map(b => b.id === editing.id ? { ...b, ...updates } : b))
        toast.success('Caixinha atualizada! ✏️')
      } else {
        const newBox = {
          userId: me.id, name: form.name, bank: form.bank, color: form.color,
          currentAmount: Number(form.current) || 0, goalAmount: Number(form.goal),
          isCoupleGoal: form.couple, createdAt: new Date().toISOString(),
        }
        const docRef = await addDoc(collection(db, 'boxes'), newBox)
        setBoxes(prev => [...prev, { id: docRef.id, ...newBox }])
        setView(form.couple ? 'cas' : 'meu')
        toast.success('Caixinha criada! 🏦')
      }
      closeModal()
    } catch (err) {
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

  function openTx(box, type) { setTxModal({ open: true, box, type }); setTxAmount('') }
  function closeTx()         { setTxModal({ open: false, box: null, type: 'deposit' }); setTxAmount('') }

  async function doTransaction() {
    const { box, type } = txModal
    const val = Number(txAmount)
    if (!val || val <= 0) { toast.error('Digite um valor válido'); return }
    const delta     = type === 'deposit' ? val : -val
    const newAmount = Math.max(0, (box.currentAmount || 0) + delta)
    setTxSaving(true)
    try {
      await updateDoc(doc(db, 'boxes', box.id), { currentAmount: newAmount })
      await addDoc(collection(db, 'boxTransactions'), {
        boxId: box.id, userId: me.id, type, amount: val,
        balanceAfter: newAmount, date: new Date().toISOString(),
      })
      setBoxes(prev => prev.map(b => b.id === box.id ? { ...b, currentAmount: newAmount } : b))
      toast.success(type === 'deposit' ? 'Valor adicionado! 💰' : 'Valor retirado! 💸')
      closeTx()
    } catch (err) {
      toast.error(err.message)
    }
    setTxSaving(false)
  }

  async function openHistory(box) {
    setHistModal({ open: true, box })
    setHistTx([])
    setHistLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'boxTransactions'), where('boxId', '==', box.id)))
      const txs  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.date.localeCompare(b.date))
      setHistTx(txs)
    } catch (err) {
      toast.error('Erro ao carregar histórico: ' + err.message)
    }
    setHistLoading(false)
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
            onDeposit={() => openTx(b, 'deposit')}
            onWithdraw={() => openTx(b, 'withdraw')}
            onHistory={() => openHistory(b)}
          />
        ))
      )}

      <Fab onClick={openCreate} />

      {/* ── Create / Edit ── */}
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

      {/* ── Delete ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Deletar caixinha">
        <p style={{ fontSize:14, color:'var(--tx2)', marginBottom:20, lineHeight:1.6 }}>
          Tem certeza que quer deletar <b style={{ color:'var(--tx1)' }}>"{confirmDelete?.name}"</b>? Esta ação não pode ser desfeita.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:'13px', background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500, color:'var(--tx2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={deleteBox} style={{ flex:1, padding:'13px', background:'var(--red,#f87171)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}>Deletar</button>
        </div>
      </Modal>

      {/* ── Deposit / Withdraw ── */}
      <Modal open={txModal.open} onClose={closeTx}
        title={txModal.type === 'deposit' ? `Depositar em "${txModal.box?.name}"` : `Retirar de "${txModal.box?.name}"`}>
        <div style={{ marginBottom:16, padding:'12px 14px', background:'var(--bg3)', borderRadius:'var(--r-sm)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--tx2)' }}>Saldo atual</span>
          <span style={{ fontSize:16, fontWeight:700, color: BOX_COLOR[txModal.box?.color] || 'var(--green)' }}>{fmt(txModal.box?.currentAmount || 0)}</span>
        </div>
        <Field label={txModal.type === 'deposit' ? 'Valor a depositar (R$)' : 'Valor a retirar (R$)'}>
          <Input type="number" inputMode="decimal" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0,00" autoFocus />
        </Field>
        {txAmount && Number(txAmount) > 0 && (
          <div style={{ marginBottom:12, fontSize:13, color:'var(--tx2)', textAlign:'center' }}>
            Novo saldo:{' '}
            <b style={{ color: txModal.type === 'deposit' ? 'var(--green)' : 'var(--red)' }}>
              {fmt(Math.max(0, (txModal.box?.currentAmount || 0) + (txModal.type === 'deposit' ? Number(txAmount) : -Number(txAmount))))}
            </b>
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button onClick={closeTx} style={{ flex:1, padding:13, background:'var(--bg3)', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:500, color:'var(--tx2)', cursor:'pointer' }}>Cancelar</button>
          <button onClick={doTransaction} disabled={txSaving || !txAmount || Number(txAmount) <= 0}
            style={{ flex:2, padding:13, border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, cursor: txSaving ? 'not-allowed' : 'pointer',
              background: txModal.type === 'deposit' ? 'var(--green)' : 'var(--red,#f87171)',
              color: txModal.type === 'deposit' ? '#000' : '#fff',
              opacity: txSaving || !txAmount || Number(txAmount) <= 0 ? .5 : 1,
            }}>
            {txSaving ? 'Salvando…' : txModal.type === 'deposit' ? '+ Depositar' : '− Retirar'}
          </button>
        </div>
      </Modal>

      {/* ── History ── */}
      <Modal open={histModal.open} onClose={() => setHistModal({ open: false, box: null })}
        title={`Histórico — ${histModal.box?.name}`}>
        {histLoading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--tx3)' }}>Carregando…</div>
        ) : !histTx.length ? (
          <div style={{ textAlign:'center', padding:'2rem' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--tx1)', marginBottom:4 }}>Sem histórico ainda</div>
            <div style={{ fontSize:12, color:'var(--tx2)' }}>Use os botões Depositar / Retirar para registrar movimentações</div>
          </div>
        ) : (
          <>
            <BalanceChart
              txs={histTx}
              goal={histModal.box?.goalAmount}
              color={BOX_COLOR[histModal.box?.color] || 'var(--green)'}
            />
            <div style={{ marginBottom:14, padding:'10px 12px', background:'var(--bg3)', borderRadius:'var(--r-sm)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--tx2)' }}>{histTx.length} movimentaç{histTx.length === 1 ? 'ão' : 'ões'}</span>
              <span style={{ fontSize:12, fontWeight:700, color: BOX_COLOR[histModal.box?.color] || 'var(--green)' }}>
                Saldo atual: {fmt(histModal.box?.currentAmount || 0)}
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {[...histTx].reverse().map(tx => (
                <TxRow key={tx.id} tx={tx} color={BOX_COLOR[histModal.box?.color] || 'var(--green)'} />
              ))}
            </div>
          </>
        )}
      </Modal>
    </PageWrap>
  )
}

/* ── Balance evolution SVG chart ── */
function BalanceChart({ txs, goal, color }) {
  if (!txs.length) return null
  const W = 300, H = 80
  const values  = [0, ...txs.map(t => t.balanceAfter)]
  const maxVal  = Math.max(...values, goal || 1)
  const pts     = values.map((v, i) => [
    i === 0 ? 0 : Math.round((i / (values.length - 1)) * W),
    Math.round(H - (v / maxVal) * (H - 10) - 5),
  ])
  const line   = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area   = `0,${H} ${line} ${pts[pts.length - 1][0]},${H}`
  const goalY  = goal ? Math.round(H - (goal / maxVal) * (H - 10) - 5) : null

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
        <span>Evolução do saldo</span>
        {goal && <span style={{ color, opacity:.7 }}>— meta: {fmt(goal)}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block', overflow:'visible' }}>
        <defs>
          <linearGradient id="boxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {goalY !== null && (
          <line x1="0" y1={goalY} x2={W} y2={goalY} stroke={color} strokeWidth="1" strokeDasharray="5 4" opacity="0.35" />
        )}
        <polyline points={area} fill="url(#boxGrad)" stroke="none" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.slice(1).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="var(--bg2)" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  )
}

/* ── Transaction row ── */
function TxRow({ tx, color }) {
  const isDeposit = tx.type === 'deposit'
  const d = new Date(tx.date)
  const dateStr = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
  const timeStr = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--bd)' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        background: isDeposit ? 'rgba(0,200,150,.12)' : 'rgba(248,113,113,.12)',
        color: isDeposit ? 'var(--green)' : 'var(--red,#f87171)',
        fontSize:15, fontWeight:700 }}>
        {isDeposit ? '↑' : '↓'}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{isDeposit ? 'Depósito' : 'Retirada'}</div>
        <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{dateStr} · {timeStr}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:13, fontWeight:700, color: isDeposit ? 'var(--green)' : 'var(--red,#f87171)' }}>
          {isDeposit ? '+' : '−'}{fmtD(tx.amount)}
        </div>
        <div style={{ fontSize:11, color:'var(--tx2)', marginTop:1 }}>
          saldo: {fmtD(tx.balanceAfter)}
        </div>
      </div>
    </div>
  )
}

/* ── Box card ── */
function BoxCard({ b, i, me, onEdit, onDelete, onDeposit, onWithdraw, onHistory }) {
  const isOwn = b.userId === me?.id
  const canTx = isOwn || b.isCoupleGoal
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
              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                <span style={{ fontSize:15, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</span>
                {b.isCoupleGoal && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'var(--pink-dim)', color:'var(--pink)', fontWeight:600, flexShrink:0 }}>casal</span>}
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <ActionBtn onClick={onHistory} title="Histórico">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </ActionBtn>
                {isOwn && <>
                  <ActionBtn onClick={onEdit} title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </ActionBtn>
                  <ActionBtn onClick={onDelete} title="Deletar" danger>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </ActionBtn>
                </>}
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:8 }}>{b.bank}</div>
            <ProgressBar value={p} color={col} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8, marginBottom: canTx ? 10 : 0 }}>
              <span style={{ fontSize:18, fontWeight:700, color:col }}>{fmt(b.currentAmount)}</span>
              <span style={{ fontSize:12, color:'var(--tx2)' }}>de {fmt(b.goalAmount)} · <b style={{color:col}}>{p}%</b></span>
            </div>
            {canTx && (
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={onDeposit} style={{ flex:1, padding:'8px 0', fontSize:12, fontWeight:600, background:'var(--green-dim)', color:'var(--green)', border:'1px solid rgba(0,200,150,.2)', borderRadius:'var(--r-sm)', cursor:'pointer' }}>
                  + Depositar
                </button>
                <button onClick={onWithdraw} style={{ flex:1, padding:'8px 0', fontSize:12, fontWeight:600, background:'rgba(248,113,113,0.08)', color:'var(--red,#f87171)', border:'1px solid rgba(248,113,113,.2)', borderRadius:'var(--r-sm)', cursor:'pointer' }}>
                  − Retirar
                </button>
              </div>
            )}
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
