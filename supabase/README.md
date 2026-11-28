# Supabase setup

1. No Supabase Dashboard, abra **SQL Editor**.
2. Execute `migrations/20261122_create_orders.sql`.
   - Se o banco já foi configurado, execute também `migrations/20261126_restrict_admin_access.sql` para restringir leitura e alterações ao e-mail administrador.
   - Execute `migrations/20261127_create_checkout_links.sql` para habilitar links de finalização individuais, de uso único e com validade de sete dias.
   - Execute `migrations/20261127_checkout_product_images.sql` para permitir links de imagem e upload de imagens personalizadas no Storage.
3. Abra **Authentication > Users > Add user**.
4. Crie o administrador com:
   - E-mail: `fehprado2025@outlook.com`
   - Senha: use a senha fornecida pelo administrador
   - Marque **Auto Confirm User**.
5. Na Vercel, configure:
   - `VITE_SUPABASE_URL=https://shovvjcntzzwvefmkbhf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key>`
6. A migração também cria:
   - A tabela `tracking_codes`.
   - A função pública `get_tracking(code)`.
   - Políticas para o administrador gerenciar rastreamentos.
## Acesso administrativo

A política do banco autoriza o e-mail `fehprado2025@outlook.com` a consultar pedidos e gerenciar rastreamentos. Mantenha apenas esse usuário como administrador no Supabase Auth.
