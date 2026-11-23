# Supabase setup

1. No Supabase Dashboard, abra **SQL Editor**.
2. Execute `migrations/20261122_create_orders.sql`.
3. Abra **Authentication > Users > Add user**.
4. Crie o administrador com:
   - E-mail: `fehprado2025@gmail.com`
   - Senha: use a senha fornecida pelo administrador
   - Marque **Auto Confirm User**.
5. Na Vercel, configure:
   - `VITE_SUPABASE_URL=https://shovvjcntzzwvefmkbhf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key>`
6. A migração também cria:
   - A tabela `tracking_codes`.
   - A função pública `get_tracking(code)`.
   - Políticas para o administrador gerenciar rastreamentos.
