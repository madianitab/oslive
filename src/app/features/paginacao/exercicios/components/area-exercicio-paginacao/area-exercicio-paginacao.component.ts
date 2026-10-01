import { Component, computed } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  BITS_HISTORICO,
  Correcao,
  ExercicioPaginacaoService,
  PaginaExercicio,
  TIPOS_EXERCICIO,
  nomePagina,
  valorHistorico,
} from 'src/app/features/paginacao/services/exercicio-paginacao.service';

@Component({
  selector: 'app-area-exercicio-paginacao',
  templateUrl: './area-exercicio-paginacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-exercicio-paginacao.component.css'],
  standalone: true,
  imports: [NgStyle, NgClass, FormsModule, OsStatComponent, OsButtonComponent],
})
export class AreaExercicioPaginacaoComponent {
  public readonly nomePagina = nomePagina;
  public readonly valorHistorico = valorHistorico;
  public readonly quadrosIdx = [0, 1, 2, 3, 4, 5, 6, 7];
  /** Colunas do histórico como no material: T1 ... T4, sendo T4 o instante mais recente. */
  public readonly colunasHistorico = Array.from({ length: BITS_HISTORICO }, (_, i) => `T${i + 1}`);

  readonly nomeTipo = computed(() => {
    const curtos: Record<string, string> = { LOGICA: 'Tabela de páginas', FISICA: 'Memória física', VITIMA: 'Página vítima' };
    return curtos[this.ex.tipo()];
  });

  readonly descricaoTipo = computed(() => TIPOS_EXERCICIO.find(t => t.valor === this.ex.tipo())?.descricao ?? '');

  readonly percentual = computed(() => {
    const p = this.ex.placar();
    return p && p.total ? Math.round((p.acertos / p.total) * 100) : 0;
  });

  constructor(public ex: ExercicioPaginacaoService) {}

  classe(c: Correcao): Record<string, boolean> {
    return { acerto: c === true, erro: c === false };
  }

  resposta(p: PaginaExercicio) {
    return this.ex.respostasLogica()[nomePagina(p)] ?? { quadro: '', bit: '' };
  }

  /** Bits na ordem das colunas T1 ... T4 (o histórico guarda o mais recente primeiro). */
  bitsT1aT4(p: PaginaExercicio): number[] {
    return [...p.historico].reverse();
  }

  historicoTexto(p: PaginaExercicio): string {
    return p.historico.join('');
  }

  explicacaoVitima(): string {
    const v = this.ex.vitima();
    if (!v) return '';
    switch (this.ex.algoritmo()) {
      case 'FIFO':
        return `${nomePagina(v)} tem o menor timestamp (${v.timestamp}): foi a primeira a entrar, então é a primeira a sair.`;
      case 'HISTORICO':
        return `${nomePagina(v)} sai: lendo de T4 (mais recente) para T1, seus bits ${v.historico.join('')} formam o menor histórico, ou seja, é a página menos usada recentemente (no empate, sai a de menor timestamp).`;
      case 'SEGUNDA_CHANCE': {
        const fila = this.ex.filaCarga();
        const antes = fila.slice(0, fila.indexOf(v)).map(p => nomePagina(p));
        const todasComBit = fila.every(p => p.bitRef === 1);
        if (todasComBit) {
          return `Todas as páginas têm bit 1: todas recebem segunda chance e, depois da volta completa, sai a mais antiga (${nomePagina(v)}).`;
        }
        return antes.length
          ? `${antes.join(', ')} ${antes.length > 1 ? 'têm' : 'tem'} bit 1 e ${antes.length > 1 ? 'recebem' : 'recebe'} segunda chance; ${nomePagina(v)} é a primeira da fila com bit 0.`
          : `${nomePagina(v)} é a mais antiga e tem bit 0, então sai direto.`;
      }
    }
  }
}
