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

export type TipoSugestao = 'sugestao' | 'erro' | 'duvida';

export interface Sugestao {
  id: number;
  tipo: TipoSugestao;
  pagina: string | null;
  texto: string;
  lida: boolean;
  criado_em: string;
  email: string | null;
  nome: string | null;
}

const CHAVE_RETORNO = 'oslive:retorno';

/** Tempo máximo para o Supabase responder antes de desistir (projeto pausado, rede lenta). */
const PRAZO_MS = 8000;

/** Mensagem mostrada quando o servidor de login não responde. */
export const MSG_SEM_RESPOSTA =
  'O servidor de login não respondeu. Ele pode estar pausado por inatividade (plano gratuito) ou a rede está lenta. Tente de novo em instantes.';

/** Rejeita se a promessa não terminar no prazo, para a tela nunca ficar parada. */
function comPrazo<T>(p: Promise<T>, ms = PRAZO_MS): Promise<T> {
  return new Promise<T>((ok, falha) => {
    const t = setTimeout(() => falha(new Error(MSG_SEM_RESPOSTA)), ms);
    p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); falha(e); });
  });
}

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
  private ouvindo = false;

  /**
   * Há sessão salva neste navegador? Verifica só o localStorage, sem baixar o Supabase,
   * para que quem nunca entrou não carregue a biblioteca nos simuladores.
   */
  temSessaoSalva(): boolean {
    if (!this.configurado) return false;
    try {
      return Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k));
    } catch {
      return false;
    }
  }

  /**
   * Carrega a sessão (inclusive a que volta do Google). Pode ser chamado várias vezes.
   * Nunca fica esperando para sempre: se o Supabase não responder em PRAZO_MS, rejeita
   * com MSG_SEM_RESPOSTA e a próxima chamada tenta de novo.
   */
  iniciar(): Promise<void> {
    this.inicio ??= comPrazo(this.carregarSessao()).catch(e => {
      this.inicio = undefined;   // não guarda a falha: a próxima chamada tenta de novo
      throw e;
    });
    return this.inicio;
  }

  async entrarComGoogle(retorno: string): Promise<void> {
    sessionStorage.setItem(CHAVE_RETORNO, retorno || '/avaliacoes');
    const sb = await comPrazo(this.supabase());
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}#/entrar` },
    });
    if (error) throw error;
  }

  async sair(): Promise<void> {
    const sb = await this.supabase();
    // sai localmente mesmo se o servidor não responder
    await comPrazo(sb.auth.signOut()).catch(() => undefined);
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

  // ───────── sugestões (tabela public.sugestoes, com RLS) ─────────

  async enviarSugestao(tipo: TipoSugestao, texto: string, pagina: string | null): Promise<void> {
    const sb = await this.supabase();
    const { error } = await sb.from('sugestoes').insert({ tipo, texto: texto.trim(), pagina });
    if (error) throw error;
  }

  /** Só a administradora (a função no banco recusa os demais). */
  async listarSugestoes(): Promise<Sugestao[]> {
    const sb = await this.supabase();
    const { data, error } = await sb.rpc('listar_sugestoes');
    if (error) throw error;
    return (data ?? []) as Sugestao[];
  }

  async marcarSugestao(id: number, lida: boolean): Promise<void> {
    const sb = await this.supabase();
    const { error } = await sb.from('sugestoes').update({ lida }).eq('id', id);
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
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    await this.aplicarSessao(data.session);

    // tira o ?code=… da barra de endereço depois do login
    if (location.search.includes('code=')) {
      history.replaceState(null, '', location.pathname + location.hash);
    }

    if (this.ouvindo) return;
    this.ouvindo = true;
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
