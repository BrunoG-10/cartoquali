# Configuração do Supabase Auth para produção

Passo a passo para deixar login, convites e recuperação de senha prontos para clientes reais.
Tudo é feito no painel do Supabase (projeto `pztxfbeghbzqvglkancj`) e na conta Google
`cartoquali@gmail.com`. **Nenhuma senha ou chave deve ser colada em chat, código ou documento.**

> Dica: desligue o tradutor automático do navegador no painel do Supabase (ele quebra a página).

---

## 1. Endereços do site (obrigatório)

**Authentication → URL Configuration**

| Campo | Valor |
|---|---|
| Site URL | `https://cartoquali.com.br` |
| Redirect URLs | `https://cartoquali.com.br/reset-password`<br>`https://cartoquali.com.br/reset-password?origem=convite`<br>`https://cartoquali.com.br/**`<br>`http://localhost:5173/**` (só para testes locais) |

Sem isso, os links dos e-mails podem levar para o endereço errado ou ser recusados.

## 2. Cadastro aberto desligado (obrigatório)

**Authentication → Sign In / Providers → Email**

- **Allow new users to sign up:** desligado. No CartoQuali, ninguém cria conta sozinho: contas
  nascem por convite (tela Usuários ou Implantações).
- **Confirm email:** ligado.
- **Secure email change:** ligado.
- **Minimum password length:** 8 (o sistema já exige 8 na tela).

## 3. Remetente próprio dos e-mails — SMTP (obrigatório)

O remetente padrão do Supabase envia poucos e-mails por hora e cai em spam com facilidade.

**3.1 Na conta Google `cartoquali@gmail.com`**

1. Ative a **verificação em duas etapas** (myaccount.google.com → Segurança).
2. Gere uma **senha de app** (Segurança → Senhas de app → nome "Supabase").
3. Guarde essa senha só para o passo seguinte. Não a envie a ninguém.

**3.2 No Supabase: Authentication → Emails → SMTP Settings → Enable custom SMTP**

| Campo | Valor |
|---|---|
| Sender email | `cartoquali@gmail.com` |
| Sender name | `CartoQuali` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `cartoquali@gmail.com` |
| Password | a senha de app do passo 3.1 |
| Minimum interval between emails | `10` segundos (padrão) |

Depois de salvar, em **Authentication → Rate Limits**, ajuste "Rate limit for sending emails"
para cerca de **30 por hora** (o Gmail aceita algumas centenas por dia).

> Mais adiante, um e-mail no domínio (ex.: `contato@cartoquali.com.br`) com um serviço como
> Resend ou Brevo melhora a entrega. O Gmail atende bem o início.

## 4. E-mails em português (recomendado)

**Authentication → Emails → Templates.** Cole cada assunto e corpo abaixo.

### Convite (Invite user)

Assunto: `Seu acesso ao CartoQuali`

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#16294a">
  <h2 style="font-family:Georgia,serif">Boas-vindas ao CartoQuali</h2>
  <p>Você recebeu um convite para acessar o CartoQuali, a plataforma de qualidade do atendimento do seu cartório.</p>
  <p>Clique no botão abaixo para criar sua senha de acesso:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#16294a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar minha senha</a></p>
  <p style="font-size:13px;color:#555">Se você não esperava este convite, ignore esta mensagem.</p>
  <p style="font-size:12px;color:#888">CartoQuali · Gestão de qualidade para cartórios</p>
</div>
```

### Recuperar senha (Reset password)

Assunto: `Redefinição de senha do CartoQuali`

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#16294a">
  <h2 style="font-family:Georgia,serif">Redefinir sua senha</h2>
  <p>Recebemos um pedido para redefinir a senha da conta {{ .Email }} no CartoQuali.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#16294a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Definir nova senha</a></p>
  <p style="font-size:13px;color:#555">O link vale por pouco tempo e só pode ser usado uma vez. Se você não pediu a redefinição, ignore esta mensagem: sua senha continua a mesma.</p>
  <p style="font-size:12px;color:#888">CartoQuali · Gestão de qualidade para cartórios</p>
</div>
```

### Troca de e-mail (Change email address)

Assunto: `Confirme seu novo e-mail no CartoQuali`

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#16294a">
  <h2 style="font-family:Georgia,serif">Confirmar novo e-mail</h2>
  <p>Confirme a troca do e-mail da sua conta de {{ .Email }} para {{ .NewEmail }}.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#16294a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar e-mail</a></p>
  <p style="font-size:13px;color:#555">Se você não pediu esta troca, ignore esta mensagem e avise o administrador do cartório.</p>
</div>
```

### Confirmação de cadastro (Confirm signup)

Não é usado (cadastro aberto desligado). Se quiser, traduza o assunto para
`Confirme seu e-mail no CartoQuali`.

## 5. Proteção contra senhas vazadas (recomendado, plano Pro)

**Authentication → Sign In / Providers → Email → Prevent use of leaked passwords.** Recusa senhas
que já apareceram em vazamentos conhecidos. Disponível no plano Pro.

## 6. Trocar a chave secreta (obrigatório — a atual foi exposta)

1. **Project Settings → API Keys → Secret keys → Create new secret key** (nome: `producao-2026-10`).
2. Copie a nova chave e atualize **sem colar em chat**:
   - Lovable: Settings → Secrets → `SUPABASE_SERVICE_ROLE_KEY`;
   - seu computador: arquivo `.env.local` do projeto, variável `SUPABASE_SERVICE_ROLE_KEY`.
3. Publique na Lovable e confira o login, o convite de usuário e uma avaliação pública.
4. Só então, em **API Keys**, **apague a chave antiga** (`sb_secret_fUJb…`).

## 7. Conferência final

- [ ] Em uma janela anônima, "Esqueci minha senha" envia e-mail em português, remetente CartoQuali,
      e o link abre `cartoquali.com.br/reset-password` com o formulário liberado.
- [ ] Convite pela tela **Usuários** chega como "Seu acesso ao CartoQuali" e abre
      "Crie sua senha de acesso"; após salvar, a pessoa entra no Painel e vê o tour.
- [ ] Convite pela tela **Implantações** (administrador de um novo cartório) faz o mesmo.
- [ ] Tentar criar conta direto pela API de cadastro é recusado (cadastro desligado).
- [ ] A chave antiga foi apagada e o sistema continua funcionando.
