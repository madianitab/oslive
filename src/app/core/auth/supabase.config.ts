/**
 * Configuração do login (Supabase). Passo a passo em docs/login-supabase.md.
 *
 * Copie de Supabase → Project Settings → API:
 *  - url: "Project URL"
 *  - chavePublica: chave "publishable" (ou a antiga "anon")
 *
 * Essas duas podem ficar no repositório público: os dados são protegidos
 * pelas regras (RLS) de supabase/schema.sql.
 * NUNCA coloque aqui a chave "secret" / "service_role".
 *
 * Enquanto estiverem vazias, o login fica desligado e as páginas
 * protegidas mostram um aviso. O resto do OSLive funciona normalmente.
 */
export const SUPABASE_CONFIG = {
  url: 'https://qbtzffrxiwleerwejlwb.supabase.co',
  chavePublica: 'sb_publishable_erk28q7pGuLA1T6mTIkIWw_q7EbPimG',
};
