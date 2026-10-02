import { Injectable, computed, signal } from '@angular/core';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';

export type Papel = 'admin' | 'professor' | 'aluno';

export interface Perfil {
  id: string;
  email: string;
  nome: string | null;
  papel: Papel;
  criado_em: string;
}

const CHAVE_RETORNO = 'oslive:retorno';

/**
 * Login com Google via Supabase.
 * A biblioteca do Supabase só é baixada quando alguma página protegida é
 * aberta (import dinâmico), então simuladores e exercícios não são afetados.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly configurado = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.chavePublica);

  readonly usuario = signal<User | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly papel = computed<Papel | null>(() => this.perfil()?.papel ?? null);

  private cliente?: Promise<SupabaseClient>;
  private inicio?: Promise<void>;

  /** Carrega a sessão (inclusive a que volta do Google). Pode ser chamado várias vezes. */
  iniciar(): Promise<void> {
    this.inicio ??= this.carregarSessao();
    return this.inicio;
  }

  async entrarComGoogle(retorno: string): Promise<void> {
    sessionStorage.setItem(CHAVE_RETORNO, retorno || '/avaliacoes');
    const sb = await this.supabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}#/entrar` },
    });
    if (error) throw error;
  }

  async sair(): Promise<void> {
    const sb = await this.supabase();
    await sb.auth.signOut();
    this.usuario.set(null);
    this.perfil.set(null);
  }

  /** Para onde ir depois do login (guardado antes de ir ao Google). */
  consumirRetorno(): string | null {
    const r = sessionStorage.getItem(CHAVE_RETORNO);
    sessionStorage.removeItem(CHAVE_RETORNO);
    return r;
  }

  async listarPerfis(): Promise<Perfil[]> {
    const sb = await this.supabase();
    const { data, error } = await sb
      .from('perfis')
      .select('*')
      .order('papel')
      .order('email');
    if (error) throw error;
    return (data ?? []) as Perfil[];
  }

  async definirPapel(id: string, papel: 'professor' | 'aluno'): Promise<void> {
    const sb = await this.supabase();
    const { error } = await sb.rpc('definir_papel', { alvo: id, novo_papel: papel });
    if (error) throw error;
  }

  // ───────── internos ─────────

  private supabase(): Promise<SupabaseClient> {
    if (!this.configurado) {
      return Promise.reject(new Error('Login não configurado (core/auth/supabase.config.ts).'));
    }
    this.cliente ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.chavePublica, {
        auth: {
          flowType: 'pkce',          // volta do Google com ?code=… (compatível com rotas #)
          detectSessionInUrl: true,
          persistSession: true,
          // trava simples: evita travamentos do navigator.locks com o Angular
          lock: async (_nome, _tempo, fn) => fn(),
        },
      }),
    );
    return this.cliente;
  }

  private async carregarSessao(): Promise<void> {
    if (!this.configurado) return;
    const sb = await this.supabase();
    const { data } = await sb.auth.getSession();
    await this.aplicarSessao(data.session);

    // tira o ?code=… da barra de endereço depois do login
    if (location.search.includes('code=')) {
      history.replaceState(null, '', location.pathname + location.hash);
    }

    sb.auth.onAuthStateChange((_evento, sessao) => {
      // fora do callback, como recomenda o Supabase
      setTimeout(() => this.aplicarSessao(sessao));
    });
  }

  private async aplicarSessao(sessao: Session | null): Promise<void> {
    const usuario = sessao?.user ?? null;
    this.usuario.set(usuario);
    if (!usuario) {
      this.perfil.set(null);
      return;
    }
    if (this.perfil()?.id === usuario.id) return;
    const sb = await this.supabase();
    const { data } = await sb.from('perfis').select('*').eq('id', usuario.id).maybeSingle();
    this.perfil.set((data as Perfil | null) ?? null);
  }
}
