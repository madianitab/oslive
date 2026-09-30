import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Processo } from 'src/app/features/escalonamento/models/processo';
import { gera_cor } from 'src/app/core/utils';
import {
  ALGORITMOS_EXERCICIO,
  AlgoritmoExercicio,
  EscalonamentoExercicioService,
} from 'src/app/features/escalonamento/services/escalonamento-exercicio.service';

export type TipoResposta = 'tabela' | 'diagrama';

export interface ConfiguracaoExercicio {
  processos: Processo[];
  algoritmo: AlgoritmoExercicio;
  quantum: number;
  tipo: TipoResposta;
}

const NOMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

@Component({
  selector: 'app-lateral-exercicio-escalonamento',
  templateUrl: './lateral-exercicio-escalonamento.component.html',
  styleUrls: [
    '../../../../../ui/styles/sim-config.css',
    './lateral-exercicio-escalonamento.component.css',
  ],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralExercicioEscalonamentoComponent {

  @Output() public iniciarExercicio = new EventEmitter<ConfiguracaoExercicio>();
  @Output() public limparExercicio = new EventEmitter<void>();

  public readonly algoritmos = ALGORITMOS_EXERCICIO;
  public algoritmo: AlgoritmoExercicio | null = null;
  public quantum: number | null = 2;

  public aleatorio = signal<boolean>(false);
  public listaProcessos = signal<Processo[]>([]);
  public editando = signal<number | null>(null);

  public processo: Processo = this.novoProcesso();

  constructor(
    private exercicioService: EscalonamentoExercicioService,
    private notifi: MatSnackBar,
  ) {}

  get usaPrioridade(): boolean {
    return this.exercicioService.usaPrioridade(this.algoritmo);
  }

  get primeiroProcesso(): boolean {
    const edit = this.editando();
    return this.listaProcessos().length === 0 || edit === 0;
  }

  alterarAlgoritmo(): void {
    this.limparExercicio.emit();
  }

  salvarProcesso(): void {
    const nome = (this.processo.nome ?? '').trim().toUpperCase();
    const edit = this.editando();
    if (this.primeiroProcesso) this.processo.chegada = 0;

    if (!nome) return this.mostrarNotificacao('Informe o nome do processo.');
    if (this.processo.chegada == null || this.processo.chegada < 0) return this.mostrarNotificacao('Informe o tempo de chegada.');
    if (!this.processo.execucao || this.processo.execucao < 1) return this.mostrarNotificacao('O tempo de execução deve ser maior que 0.');
    if (this.usaPrioridade && (this.processo.prioridade == null || this.processo.prioridade < 0)) {
      return this.mostrarNotificacao('Informe a prioridade do processo.');
    }
    const nomeRepetido = this.listaProcessos().some((p, i) => p.nome === nome && i !== edit);
    if (nomeRepetido) return this.mostrarNotificacao('Já existe um processo com esse nome!');

    const novo = new Processo(nome, Number(this.processo.chegada), Number(this.processo.execucao),
      this.processo.prioridade == null ? null : Number(this.processo.prioridade), this.processo.cor);

    this.listaProcessos.update(lista => {
      const copia = [...lista];
      if (edit !== null) {
        copia[edit] = novo;
      } else {
        novo.cor = gera_cor(copia);
        copia.push(novo);
      }
      return copia.sort((a, b) => a.chegada - b.chegada);
    });
    this.limparForm();
    this.limparExercicio.emit();
  }

  iniciarEdicao(index: number): void {
    this.processo = this.listaProcessos()[index].clone();
    this.editando.set(index);
    this.aleatorio.set(false);
  }

  excluir(index: number): void {
    this.listaProcessos.update(lista => lista.filter((_, i) => i !== index));
    if (this.editando() === index) this.limparForm();
    this.limparExercicio.emit();
  }

  limparForm(): void {
    this.processo = this.novoProcesso();
    this.editando.set(null);
  }

  geradorAleatorio(): void {
    const lista: Processo[] = [];
    const chegadas = new Set<number>([0]);
    for (let i = 0; i < 4; i++) {
      let chegada = 0;
      if (i > 0) {
        do { chegada = Math.floor(Math.random() * 10) + 1; } while (chegadas.has(chegada));
        chegadas.add(chegada);
      }
      const p = new Processo(NOMES[i], chegada, Math.floor(Math.random() * 7) + 1,
        Math.floor(Math.random() * 4), '');
      p.cor = gera_cor(lista);
      lista.push(p);
    }
    this.listaProcessos.set(lista.sort((a, b) => a.chegada - b.chegada));
    this.quantum = Math.floor(Math.random() * 3) + 1;
    this.limparForm();
    this.limparExercicio.emit();
  }

  responder(tipo: TipoResposta): void {
    const processos = this.listaProcessos();
    if (!this.algoritmo) return this.mostrarNotificacao('Selecione o algoritmo de escalonamento.');
    if (processos.length < 2) return this.mostrarNotificacao('Cadastre pelo menos 2 processos.');
    if (processos[0].chegada !== 0) return this.mostrarNotificacao('O primeiro processo deve chegar no tempo 0.');
    if (this.usaPrioridade && processos.some(p => p.prioridade == null)) {
      return this.mostrarNotificacao('Há processos sem prioridade.');
    }
    if (this.algoritmo === 'RR' && (!this.quantum || this.quantum < 1)) {
      return this.mostrarNotificacao('Informe a fatia de tempo (quantum).');
    }
    this.iniciarExercicio.emit({
      processos: processos.map(p => p.clone()),
      algoritmo: this.algoritmo,
      quantum: Number(this.quantum ?? 0),
      tipo,
    });
  }

  reiniciar(): void {
    this.algoritmo = null;
    this.quantum = 2;
    this.aleatorio.set(false);
    this.listaProcessos.set([]);
    this.limparForm();
    this.limparExercicio.emit();
  }

  private novoProcesso(): Processo {
    return new Processo('', 0, null, null, '');
  }

  private mostrarNotificacao(mensagem: string): void {
    this.notifi.open(mensagem, 'Fechar', { duration: 2500 });
  }
}
