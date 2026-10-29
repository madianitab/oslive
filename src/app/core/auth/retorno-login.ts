/**
 * Retorno do login com Google (fluxo PKCE).
 *
 * O Supabase devolve o navegador para `.../oslive/?code=…#/entrar` (ou `?error=…`).
 * Ao iniciar, o roteador do Angular (rotas com #) reescreve a URL para `/#/entrar`
 * e apaga esse `?code=…` ANTES de a biblioteca do Supabase ser carregada (ela vem por
 * import dinâmico). Por isso, o código é guardado aqui, em main.ts, antes do Angular,
 * e o AuthService faz a troca pela sessão explicitamente.
 *
 * Este arquivo não importa o Supabase: não aumenta o pacote inicial.
 */

const CHAVE = 'oslive:retorno-login';

export interface RetornoLogin {
  code?: string;
  erro?: string;
}

/** Chamado em main.ts, antes do bootstrap. Guarda o retorno e limpa a barra de endereço. */
export function guardarRetornoDoLogin(): void {
  try {
    const p = new URLSearchParams(location.search);
    const code = p.get('code');
    const erro = p.get('error_description') || p.get('error');
    if (!code && !erro) return;
    const r: RetornoLogin = code ? { code } : { erro: erro! };
    sessionStorage.setItem(CHAVE, JSON.stringify(r));
    history.replaceState(history.state, '', location.pathname + location.hash);
  } catch {
    // sem sessionStorage (modo restrito): o login só não se completa
  }
}

/** Lê e apaga o retorno guardado (o código só pode ser usado uma vez). */
export function consumirRetornoDoLogin(): RetornoLogin | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as RetornoLogin) : null;
  } catch {
    return null;
  }
}

/** Há retorno do Google esperando ser processado? (sem consumir) */
export function temRetornoDoLogin(): boolean {
  try {
    return !!sessionStorage.getItem(CHAVE);
  } catch {
    return false;
  }
}
