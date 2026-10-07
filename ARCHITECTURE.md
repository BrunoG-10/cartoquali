# Arquitetura do CartoQuali

## Estado atual

Aplicação TanStack Start (React 19) com dados reais no Supabase externo (PostgreSQL + Auth). Não há camada de dados fictícios: toda tela lê e grava pelo banco.

## Camadas

```text
Navegador ── rotas e componentes (src/routes, src/components/cartoquali)
   │  TanStack Query + useServerFn
   ▼
Funções de servidor (src/lib/*.functions.ts)
   │  requireSupabaseAuth: valida o JWT e cria um cliente Supabase em nome do usuário
   ▼
Supabase ── RLS por cartorio_id + RPCs security definer + triggers de auditoria
```

- `src/lib/*.functions.ts`: regras de negócio e acesso ao banco, sempre no servidor.
- `src/integrations/supabase/`: clientes Supabase (gerados pelo Lovable). `client.server.ts` usa a chave secreta e só pode ser importado dentro de handlers de servidor.
- `src/lib/permissions.ts`: matriz de capacidades por papel, espelhada no servidor e no RLS.
- `src/lib/roles.ts`: papel efetivo do usuário (`primaryDbRole`) quando ele possui vários papéis.
- `src/lib/public-url.ts`: URL canônica pública (`VITE_PUBLIC_APP_URL`) para links, QR Code e NFC.
- `supabase/migrations/`: esquema, RLS, funções e triggers do banco.

## Isolamento entre cartórios

Todas as tabelas operacionais têm `cartorio_id`. O cartório da sessão é derivado no banco a partir de `auth.uid()` (`cartoquali_private.current_cartorio_id()`); o cliente nunca escolhe o cartório. Escritas sensíveis passam por RPCs que validam papel e cartório.

## Fluxos públicos

- `/avaliar/{codigo}`: carrega a pesquisa e envia a avaliação por funções de servidor que usam a chave secreta e RPCs restritas, com idempotência e limite por sessão.
- `/`: landing page sem dados de cartórios; só grava leads comerciais.

## Variáveis de ambiente

- `.env` (versionado): apenas valores públicos — URL e chave publishable do Supabase, `VITE_PUBLIC_APP_URL`.
- `.env.local` (ignorado): `SUPABASE_SERVICE_ROLE_KEY` local. Em produção, o mesmo segredo fica nos secrets da Lovable.
