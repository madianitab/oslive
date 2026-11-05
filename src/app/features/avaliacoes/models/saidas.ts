/**
 * Saídas da página durante a prova (trocar de aba, minimizar, ir para outra janela).
 * Só a contagem, sem Angular: a tela avisa o contador e envia o que ficou pendente.
 * O banco só soma (registrar_saidas): o aluno não consegue diminuir o que já foi gravado.
 */
export class ContadorSaidas {
  private fora = false;
  private desde = 0;
  private saidas = 0;
  private ms = 0;

  /** A página deixou de estar visível ou em foco. Conta uma saída por vez. */
  sair(agora: number): void {
    if (this.fora) return;
    this.fora = true;
    this.desde = agora;
    this.saidas++;
  }

  /** O aluno voltou para a página. */
  voltar(agora: number): void {
    if (!this.fora) return;
    this.fora = false;
    this.ms += Math.max(0, agora - this.desde);
  }

  get estaFora(): boolean {
    return this.fora;
  }

  /** Retira o que ainda não foi enviado (segundos inteiros; o resto fica para a próxima). */
  retirar(): { saidas: number; segundos: number } {
    const segundos = Math.floor(this.ms / 1000);
    const r = { saidas: this.saidas, segundos };
    this.saidas = 0;
    this.ms -= segundos * 1000;
    return r;
  }

  /** Devolve o que não conseguiu enviar (tenta de novo depois). */
  devolver(r: { saidas: number; segundos: number }): void {
    this.saidas += r.saidas;
    this.ms += r.segundos * 1000;
  }
}

/** Tempo fora para a tabela: "45 s", "3 min 05 s", "1 h 02 min". */
export function tempoFora(segundos: number | null | undefined): string {
  const s = Math.max(0, Math.floor(Number(segundos) || 0));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}
