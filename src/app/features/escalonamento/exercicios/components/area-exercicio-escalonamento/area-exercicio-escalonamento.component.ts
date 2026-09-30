import { Component, Input, OnChanges, SimpleChanges, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle, NgClass } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  ALGORITMOS_EXERCICIO,
  Correcao,
  EscalonamentoExercicioService,
  GabaritoEscalonamento,
} from 'src/app/features/escalonamento/services/escalonamento-exercicio.service';
import { ConfiguracaoExercicio } from '../lateral-exercicio-escalonamento/lateral-exercicio-escalonamento.component';

interface RespostaTabela {
  espera: string;
  turnaround: string;
  corretoEspera: Correcao;
  corretoTurnaround: Correcao;
}

interface RespostaDiagrama {
  valor: string;
  correto: Correcao;
}

@Component({
  selector: 'app-area-exercicio-escalonamento',
  templateUrl: './area-exercicio-escalonamento.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-exercicio-escalonamento.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, NgClass, OsStatComponent, OsButtonComponent],
})
export class AreaExercicioEscalonamentoComponent implements OnChanges {

  @Input() public configuracao: ConfiguracaoExercicio | null = null;

  public gabarito = signal<GabaritoEscalonamento | null>(null);
  public respostasTabela = signal<RespostaTabela[]>([]);
  public respostasDiagrama = signal<RespostaDiagrama[]>([]);
  public mostrarResposta = signal<boolean>(false);
  public resultado = signal<{ acertos: number; total: number } | null>(null);

  public readonly percentual = computed(() => {
    const r = this.resultado();
    return r && r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0;
  });

  constructor(
    private exercicioService: EscalonamentoExercicioService,
    private notifi: MatSnackBar,
  ) {}

  get nomeAlgoritmo(): string {
    const cfg = this.configuracao;
    if (!cfg) return '';
    const nome = ALGORITMOS_EXERCICIO.find(a => a.valor === cfg.algoritmo)?.nome ?? '';
    return cfg.algoritmo === 'RR' ? `${nome} — quantum = ${cfg.quantum}` : nome;
  }

  /** Nome curto para a faixa de estatísticas (ex.: "SJF", "RR"). */
  get nomeAlgoritmoCurto(): string {
    const curtos: Record<string, string> = {
      FIFO: 'FIFO', SJF: 'SJF', PRIO: 'Prioridade NP', PRIO_P: 'Prioridade P', RR: 'Round Robin',
    };
    return curtos[this.configuracao?.algoritmo ?? ''] ?? '';
  }

  /** Tabela de resultado: dados dos processos exibidos como base para o cálculo. */
  get processosOrdenados() {
    return [...(this.configuracao?.processos ?? [])].sort((a, b) => a.chegada - b.chegada);
  }

  get usaPrioridade(): boolean {
    const alg = this.configuracao?.algoritmo;
    return alg === 'PRIO' || alg === 'PRIO_P';
  }

  get processosLegenda(): string {
    return (this.configuracao?.processos ?? []).map(p => p.nome).join(', ');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configuracao']) {
      this.iniciar();
    }
  }

  private iniciar(): void {
    this.mostrarResposta.set(false);
    this.resultado.set(null);
    const cfg = this.configuracao;
    if (!cfg) {
      this.gabarito.set(null);
      return;
    }
    const gabarito = this.exercicioService.gerarGabarito(cfg.processos, cfg.algoritmo, cfg.quantum);
    this.gabarito.set(gabarito);
    this.respostasTabela.set(gabarito.tabela.map(() => ({
      espera: '', turnaround: '', corretoEspera: null, corretoTurnaround: null,
    })));
    this.respostasDiagrama.set(gabarito.diagrama.map(() => ({ valor: '', correto: null })));
  }

  corrigir(): void {
    const gabarito = this.gabarito();
    const cfg = this.configuracao;
    if (!gabarito || !cfg) return;

    let acertos = 0;
    let total = 0;

    if (cfg.tipo === 'tabela') {
      this.respostasTabela.update(respostas => respostas.map((r, i) => {
        const linha = gabarito.tabela[i];
        const corretoEspera = this.exercicioService.corrigirNumero(r.espera, linha.espera);
        const corretoTurnaround = this.exercicioService.corrigirNumero(r.turnaround, linha.turnaround);
        acertos += (corretoEspera ? 1 : 0) + (corretoTurnaround ? 1 : 0);
        total += 2;
        return { ...r, corretoEspera, corretoTurnaround };
      }));
    } else {
      this.respostasDiagrama.update(respostas => respostas.map((r, i) => {
        const correto = this.exercicioService.normalizarCelulaDiagrama(r.valor) === gabarito.diagrama[i].nome;
        acertos += correto ? 1 : 0;
        total += 1;
        return { ...r, valor: this.exercicioService.normalizarCelulaDiagrama(r.valor), correto };
      }));
    }

    this.resultado.set({ acertos, total });
    const mensagem = acertos === total
      ? 'Parabéns, você acertou tudo!'
      : `Você acertou ${acertos} de ${total}. Revise os campos em vermelho.`;
    this.notifi.open(mensagem, 'Fechar', { duration: 3500 });
  }

  alternarResposta(): void {
    this.mostrarResposta.update(v => !v);
  }

  limparRespostas(): void {
    this.iniciar();
  }

  atualizarTabela(index: number, campo: 'espera' | 'turnaround', valor: string): void {
    this.respostasTabela.update(respostas => {
      const copia = [...respostas];
      copia[index] = {
        ...copia[index],
        [campo]: valor,
        ...(campo === 'espera' ? { corretoEspera: null } : { corretoTurnaround: null }),
      };
      return copia;
    });
  }

  atualizarDiagrama(index: number, valor: string): void {
    this.respostasDiagrama.update(respostas => {
      const copia = [...respostas];
      copia[index] = { valor: valor.toUpperCase(), correto: null };
      return copia;
    });
  }

  classeCorrecao(correto: Correcao): Record<string, boolean> {
    return { acerto: correto === true, erro: correto === false };
  }
}
