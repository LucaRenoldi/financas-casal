import { useState } from 'react'
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'
import { PageWrap, Card, CardTitle, fmt } from '../components/UI'

export default function CouplePage({ me, partner, onPartnerLinked }) {
  const [code, setCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(me?.coupleCode || '')
    setCopied(true)
    toast.success('Código copiado! 📋')
    setTimeout(() => setCopied(false), 2500)
  }

  async function linkPartner() {
    if (code.trim().length < 6) { toast.error('Digite o código completo (6 caracteres)'); return }
    setLinking(true)
    try {
      const q = query(collection(db, 'profiles'), where('coupleCode', '==', code.trim().toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) { toast.error('Código inválido ou não encontrado'); setLinking(false); return }

      const partnerDoc = snap.docs[0]
      if (partnerDoc.id === me.id) { toast.error('Esse é o seu próprio código!'); setLinking(false); return }
      if (me.partnerId) { toast.error('Você já tem um parceiro vinculado'); setLinking(false); return }

      const batch = writeBatch(db)
      batch.update(doc(db, 'profiles', me.id),        { partnerId: partnerDoc.id })
      batch.update(doc(db, 'profiles', partnerDoc.id), { partnerId: me.id })
      await batch.commit()

      toast.success('Vinculado(a) com sucesso! 💚')
      onPartnerLinked()
    } catch (err) {
      toast.error(err.message)
    }
    setLinking(false)
  }

  async function unlinkPartner() {
    if (!confirm('Deseja desvincular o casal?')) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'profiles', me.id), { partnerId: null })
    if (partner) batch.update(doc(db, 'profiles', partner.id), { partnerId: null })
    await batch.commit()
    toast.success('Desvinculado(a)')
    onPartnerLinked()
  }

  return (
    <PageWrap>
      <div className="fade-up" style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:4 }}>Casal</div>
        <div style={{ fontSize:13, color:'var(--tx2)' }}>Conecte suas finanças com sua namorada</div>
      </div>

      {!partner ? (
        <>
          <div className="fade-up fade-up-1">
            <Card>
              <CardTitle>Seu código de convite</CardTitle>
              <p style={{ fontSize:13, color:'var(--tx2)', marginBottom:14, lineHeight:1.6 }}>
                Compartilhe este código com sua namorada para conectar as contas de vocês.
              </p>
              <div style={{ background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r)', padding:'20px', textAlign:'center', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--tx2)', marginBottom:8, letterSpacing:'.5px', textTransform:'uppercase', fontWeight:600 }}>Código</div>
                <div style={{ fontSize:32, fontWeight:700, letterSpacing:8, color:'var(--green)', fontFamily:'monospace', marginBottom:4 }}>
                  {me?.coupleCode || '------'}
                </div>
                <div style={{ fontSize:11, color:'var(--tx3)' }}>toque para copiar</div>
              </div>
              <button onClick={copyCode} style={{ width:'100%', padding:'13px', background: copied ? 'var(--green-dim)' : 'var(--green)', color: copied ? 'var(--green)' : '#000', border: copied ? '1px solid var(--green)' : 'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, transition:'all .2s' }}>
                {copied ? '✓ Copiado!' : '📋 Copiar código'}
              </button>
              <div style={{ marginTop:12, padding:'10px 14px', background:'var(--bg4)', borderRadius:'var(--r-sm)', fontSize:12, color:'var(--tx2)', lineHeight:1.6 }}>
                💡 Dica: mande o código pelo WhatsApp para sua namorada. Quando ela inserir o código no app dela, vocês ficam conectados automaticamente.
              </div>
            </Card>
          </div>

          <div className="fade-up fade-up-2">
            <Card>
              <CardTitle>Já tenho um código</CardTitle>
              <p style={{ fontSize:13, color:'var(--tx2)', marginBottom:14, lineHeight:1.6 }}>
                Digite o código que sua namorada compartilhou com você.
              </p>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--tx2)', marginBottom:8, letterSpacing:'.5px', textTransform:'uppercase' }}>Código do(a) parceiro(a)</label>
                <input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123" maxLength={6}
                  style={{ width:'100%', padding:'16px', background:'var(--bg3)', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:28, fontWeight:700, fontFamily:'monospace', letterSpacing:8, textAlign:'center', color:'var(--tx1)', textTransform:'uppercase', transition:'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor='var(--green)'}
                  onBlur={e => e.target.style.borderColor='var(--bd2)'}
                />
                <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:8 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ width:6, height:6, borderRadius:'50%', background: i < code.length ? 'var(--green)' : 'var(--bg4)', transition:'background .15s' }} />
                  ))}
                </div>
              </div>
              <button onClick={linkPartner} disabled={linking || code.length < 6}
                style={{ width:'100%', padding:'14px', background: code.length < 6 ? 'var(--bg4)' : linking ? 'var(--bg4)' : 'var(--green)', color: code.length < 6 || linking ? 'var(--tx3)' : '#000', border:'none', borderRadius:'var(--r-sm)', fontSize:14, fontWeight:700, transition:'all .2s', cursor: code.length < 6 || linking ? 'not-allowed' : 'pointer' }}>
                {linking ? 'Vinculando…' : 'Vincular com parceiro(a) 💚'}
              </button>
            </Card>
          </div>
        </>
      ) : (
        <div className="fade-up fade-up-1">
          <div style={{ background:'linear-gradient(135deg, rgba(0,200,150,0.08) 0%, rgba(255,107,157,0.08) 100%)', border:'1px solid rgba(0,200,150,0.2)', borderRadius:'var(--r)', padding:'1.5rem', textAlign:'center', marginBottom:12 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>💑</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Vocês estão conectados!</div>
            <div style={{ fontSize:13, color:'var(--tx2)' }}>Compartilhando finanças com {partner.name}</div>
          </div>

          <Card>
            <CardTitle>Parceiro(a)</CardTitle>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--pink-dim)', color:'var(--pink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 }}>
                {partner.avatarInitials}
              </div>
              <div>
                <div style={{ fontSize:17, fontWeight:600 }}>{partner.name}</div>
                <div style={{ fontSize:13, color:'var(--tx2)', marginTop:2 }}>
                  Código: <span style={{ fontFamily:'monospace', fontWeight:600, letterSpacing:2 }}>{partner.coupleCode}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Seu código</CardTitle>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:'monospace', letterSpacing:4, color:'var(--green)' }}>{me?.coupleCode}</div>
              <button onClick={copyCode} style={{ padding:'8px 16px', background:'var(--green-dim)', color:'var(--green)', border:'1px solid rgba(0,200,150,.2)', borderRadius:'var(--r-sm)', fontSize:13, fontWeight:600 }}>
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
          </Card>

          <button onClick={unlinkPartner} style={{ width:'100%', padding:13, background:'transparent', border:'1px solid var(--bd2)', borderRadius:'var(--r-sm)', fontSize:13, color:'var(--tx2)', marginTop:4 }}>
            Desvincular casal
          </button>
        </div>
      )}
    </PageWrap>
  )
}
