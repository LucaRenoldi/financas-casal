# 💚 Finanças do Casal — React PWA

App de gestão financeira a dois, feito com React + Vite + Supabase.

---

## Pré-requisitos
- Node.js 18+ instalado ([nodejs.org](https://nodejs.org))
- Conta no Supabase ([supabase.com](https://supabase.com))

---

## Passo 1 — Banco de dados (Supabase)

1. Crie um projeto no Supabase
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo do arquivo `schema.sql` e clique em **Run**

---

## Passo 2 — Variáveis de ambiente

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Abra o `.env` e preencha com os valores do seu projeto Supabase
(Settings → API → Project URL e anon public key):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

---

## Passo 3 — Instalar e rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## Passo 4 — Build para produção

```bash
npm run build
```

A pasta `dist/` gerada é o que você sobe para o Vercel ou Netlify.

---

## Deploy na Vercel

1. Suba o código para um repositório GitHub
2. Importe o projeto na Vercel
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

---

## Deploy no Netlify

1. Rode `npm run build`
2. Arraste a pasta `dist/` para [app.netlify.com/drop](https://app.netlify.com/drop)

Ou via GitHub + Netlify com as mesmas variáveis de ambiente.

---

## Instalar como app no celular

- **Android (Chrome):** menu ⋮ → "Adicionar à tela inicial"
- **iPhone (Safari):** botão compartilhar → "Adicionar à Tela de Início"

---

## Funcionalidades

- ✅ Login, cadastro e **recuperação de senha**
- ✅ Vinculação de casal via código de 6 dígitos
- ✅ Gerar e copiar seu código de convite
- ✅ Colar código do(a) parceiro(a) com feedback visual
- ✅ Despesas individuais e compartilhadas
- ✅ Gráfico de pizza por categoria (individual, parceiro(a), juntos)
- ✅ Barra de participação no mês
- ✅ Caixinhas Nubank e Itaú com metas
- ✅ Objetivos do casal
- ✅ Filtro por mês
- ✅ PWA — funciona offline e instala como app
- ✅ Dark mode nativo
- ✅ Responsivo — celular e desktop
