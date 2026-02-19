
# Configuração Inicial do Supabase - Prisma RH

Este guia descreve os passos necessários para configurar o banco de dados e o storage do projeto Prisma RH no Supabase.

## 1. Banco de Dados (SQL Editor)

1.  Acesse o dashboard do seu projeto no Supabase.
2.  No menu lateral esquerdo, clique em **SQL Editor**.
3.  Clique em **+ New Query**.
4.  Copie todo o conteúdo do arquivo `docs/supabase_schema.sql`.
5.  Cole no editor do Supabase.
6.  Clique em **Run** (botão verde no canto inferior direito).
7.  **Verifique o resultado:** Na mensagem de sucesso, certifique-se de que não houve erros.
8.  Vá para o menu **Table Editor** e confirme se as seguintes tabelas foram criadas:
    *   `tenants`
    *   `profiles`
    *   `tags`, `candidate_categories`, `finance_categories`, `services`
    *   `companies`, `person_clients`
    *   `candidates`
    *   `job_openings`, `job_candidates`
    *   `orders`
    *   `finance_transactions`

## 2. Storage (Bucket de Arquivos)

Os currículos e anexos serão salvos em um bucket privado.

1.  No menu lateral esquerdo, clique em **Storage**.
2.  Clique em **+ New Bucket**.
3.  Preencha os campos:
    *   **Name:** `uploads`
    *   **Public bucket:** Deixe **DESMARCADO** (Off). Queremos arquivos privados por segurança.
    *   **Allowed MIME types:** Opcional (sugerido: `application/pdf`, `image/png`, `image/jpeg`).
4.  Clique em **Save**.

### Estrutura de Pastas (Padrão sugerido)
O sistema salvará os arquivos seguindo esta estrutura lógica:
`{tenant_id}/{entity_type}/{entity_id}/{filename}`

Exemplo:
`a0eebc99-9c0b.../candidates/550e8400-e29b.../curriculo.pdf`

## 3. Chaves de Acesso e Variáveis de Ambiente

Para conectar o app, você precisará das credenciais do projeto.

1.  Vá em **Project Settings** (ícone de engrenagem) > **API**.
2.  Copie a **Project URL**.
3.  Copie a chave **anon** (public).
4.  Atualize seu arquivo `.env` ou `.env.local` no projeto:

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

> **Atenção:** Nunca exponha a chave `service_role` no código frontend. Use apenas a chave `anon`.

## 4. Checklist de Validação Final

- [ ] Schema SQL rodado sem erros.
- [ ] Tabelas criadas no Table Editor.
- [ ] Dados iniciais (Seed) aparecem nas tabelas `tenants`, `services`, `tags`, etc.
- [ ] Bucket `uploads` criado e marcado como Privado.
- [ ] Variáveis de ambiente configuradas no código local.

## 5. Próximos Passos (Desenvolvimento)

O banco está pronto. O próximo passo no desenvolvimento será:
1. Configurar o cliente Supabase no React.
2. Criar as Policies (RLS) para permitir que os usuários leiam/escrevam apenas no seu próprio `tenant_id`.
3. Substituir os repositórios Mock pelos repositórios reais do Supabase.
