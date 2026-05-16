import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) toast.error(error.message)
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Digite seu nome'); return }
    if (form.password.length < 6) { toast.error('Senha deve ter mínimo 6 caracteres'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (data.user) {
      const initials = form.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id, name: form.name.trim(), avatar_initials: initials, couple_code: code
      })
      if (profileError) toast.error('Conta criada mas erro no perfil: ' + profileError.message)
      else toast.success('Conta criada com sucesso! 🎉')
    }
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!form.email) { toast.error('Digite seu e-mail'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin + '/?reset=true'
    })
    if (error) toast.error(error.message)
    else toast.success('Link de recuperação enviado! Verifique seu e-mail 📧')
    setLoading(false)
  }

  return (
    <div className={styles.root}>
      {/* Background decoration */}
      <div className={styles.bg}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.grid} />
      </div>

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>💚</div>
          <h1 className={styles.logoTitle}>Finanças do Casal</h1>
          <p className={styles.logoSub}>
            {mode === 'login' && 'Bem-vindo(a) de volta'}
            {mode === 'signup' && 'Crie sua conta e convide sua namorada'}
            {mode === 'forgot' && 'Recupere seu acesso'}
          </p>
        </div>

        {/* Tabs (only login/signup) */}
        {mode !== 'forgot' && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${mode==='login' ? styles.tabActive : ''}`} onClick={() => setMode('login')}>Entrar</button>
            <button className={`${styles.tab} ${mode==='signup' ? styles.tabActive : ''}`} onClick={() => setMode('signup')}>Criar conta</button>
          </div>
        )}

        {/* LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className={styles.form}>
            <Field label="E-mail" type="email" value={form.email} onChange={v => set('email', v)} placeholder="seu@email.com" autoComplete="email" />
            <Field label="Senha" type="password" value={form.password} onChange={v => set('password', v)} placeholder="••••••••" autoComplete="current-password" />
            <button type="button" className={styles.forgotLink} onClick={() => setMode('forgot')}>
              Esqueci minha senha
            </button>
            <SubmitBtn loading={loading}>Entrar</SubmitBtn>
          </form>
        )}

        {/* SIGNUP */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className={styles.form}>
            <Field label="Seu nome" type="text" value={form.name} onChange={v => set('name', v)} placeholder="Como quer ser chamado(a)?" autoComplete="name" />
            <Field label="E-mail" type="email" value={form.email} onChange={v => set('email', v)} placeholder="seu@email.com" autoComplete="email" />
            <Field label="Senha" type="password" value={form.password} onChange={v => set('password', v)} placeholder="mínimo 6 caracteres" autoComplete="new-password" />
            <SubmitBtn loading={loading}>Criar minha conta</SubmitBtn>
          </form>
        )}

        {/* FORGOT */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className={styles.form}>
            <p className={styles.forgotDesc}>
              Digite seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
            <Field label="E-mail" type="email" value={form.email} onChange={v => set('email', v)} placeholder="seu@email.com" autoComplete="email" />
            <SubmitBtn loading={loading}>Enviar link de recuperação</SubmitBtn>
            <button type="button" className={styles.backLink} onClick={() => setMode('login')}>
              ← Voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--tx2)', marginBottom:6, letterSpacing:'.5px', textTransform:'uppercase' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={isPass && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          inputMode={type === 'email' ? 'email' : undefined}
          style={{
            width:'100%', padding:'13px 16px', paddingRight: isPass ? 44 : 16,
            background:'var(--bg3)', border:'1px solid var(--bd2)',
            borderRadius:'var(--r-sm)', fontSize:15, color:'var(--tx1)',
            transition:'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor='var(--green)'}
          onBlur={e => e.target.style.borderColor='var(--bd2)'}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--tx2)', fontSize:16, background:'none', border:'none', cursor:'pointer' }}>
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  )
}

function SubmitBtn({ loading, children }) {
  return (
    <button type="submit" disabled={loading} style={{
      width:'100%', padding:'14px', marginTop:8,
      background: loading ? 'var(--bg4)' : 'var(--green)',
      color: loading ? 'var(--tx2)' : '#000',
      border:'none', borderRadius:'var(--r-sm)',
      fontSize:15, fontWeight:700, letterSpacing:'.2px',
      transition:'all .15s', cursor: loading ? 'not-allowed' : 'pointer',
    }}>
      {loading ? 'Aguarde…' : children}
    </button>
  )
}
