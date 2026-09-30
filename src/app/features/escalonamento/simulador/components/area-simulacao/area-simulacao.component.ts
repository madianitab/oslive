import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { Processo } from 'src/app/features/escalonamento/models/processo';
import { ListaProcessos } from 'src/app/features/escalonamento/models/lista-processos';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EscalonamentoService, ResultadoCpu } from 'src/app/features/escalonamento/services/escalonamento.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgStyle } from '@angular/common';
import { GraficoComponent } from '../grafico/grafico.component';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';

@Component({
    selector: 'app-area-simulacao',
    templateUrl: './area-simulacao.component.html',
    styleUrls: ['./area-simulacao.component.css'],
    animations: [
        trigger('fade', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('500ms', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('500ms', style({ opacity: 0 }))
            ])
        ])
    ],
    standalone: true,
    imports: [
    NgStyle,
    GraficoComponent,
    OsStatComponent
],
})
export class AreaSimulacaoComponent implements OnInit {

  @Input() public listaProcessos: Array<Processo> = [];
  @Input() public escalonador: Number = new Number;
  @Input() public animacao?: Boolean | null;
  @Input() public quantum!: Number;
  @Input() public quantum1!: Number;
  @Input() public quantum2!: Number;
  @Input() public quantum3!: Number;
  @Input() public filaRR1?: boolean | null;
  @Input() public filaRR2?: boolean | null;
  @Input() public filaRR3?: boolean | null;
  @Input() public filaRR4?: boolean | null;

  // Signals — estado reativo
  readonly resultados = signal<ResultadoCpu[]>([]);
  readonly resultados2 = signal<{ nome: string; espera: number; execucao: number; turn: number }[]>([]);
  readonly processosVisiveis = signal<ResultadoCpu[]>([]);

  // Métricas agregadas para a faixa de stats
  readonly nProcessos = computed(() => this.resultados2().length);
  readonly mediaEspera = computed(() => {
    const r = this.resultados2();
    return r.length ? (r.reduce((s, x) => s + x.espera, 0) / r.length).toFixed(1) : '—';
  });
  readonly mediaTurnaround = computed(() => {
    const r = this.resultados2();
    return r.length ? (r.reduce((s, x) => s + x.turn, 0) / r.length).toFixed(1) : '—';
  });

  readonly fila1Estatica = signal<{ nome: string; cor: string }[]>([]);
  readonly fila2Estatica = signal<{ nome: string; cor: string }[]>([]);
  readonly fila3Estatica = signal<{ nome: string; cor: string }[]>([]);
  readonly fila4Estatica = signal<{ nome: string; cor: string }[]>([]);

  readonly fila1V = signal<{ nome: string; cor: string }[]>([]);
  readonly fila2V = signal<{ nome: string; cor: string }[]>([]);
  readonly fila3V = signal<{ nome: string; cor: string }[]>([]);
  readonly fila4V = signal<{ nome: string; cor: string }[]>([]);

  public auxFilaAptoEntrada: Processo[] = [];
  public auxFilaAptoSaida: Processo[] = [];
  public auxFilaApto: Processo[] = [];

  public processoAtual = 0;
  public tempoCpu: number = 0;

  /** Algoritmos básicos (FIFO, SJF, Prioridade NP e P): fila de aptos animada durante a simulação. */
  readonly animandoFilaBasica = signal(false);
  /** Identifica a execução atual da animação; muda ao cancelar ou reiniciar para interromper a anterior. */
  private execucaoAnimacao = 0;

  constructor(
    private simulationService: Comunicacao,
    private notifi: MatSnackBar,
    private escalonamentoService: EscalonamentoService,
  ) {
    this.simulationService.registerFunction('iniciaSimulacao', this.iniciaSimulacao.bind(this));
    this.simulationService.registerFunction('cancelar', this.cancelar.bind(this));
  }

  ngOnInit(): void {}

  cancelar() {
    this.execucaoAnimacao++;
    this.animandoFilaBasica.set(false);
    this.fila1V.set([]);
    this.resultados.set([]);
    this.processoAtual = 0;
    this.processosVisiveis.set([]);
    this.fila1Estatica.set([]);
    this.fila2Estatica.set([]);
    this.fila3Estatica.set([]);
    this.fila4Estatica.set([]);
    this.auxFilaApto = [];
    this.resultados2.set([]);
    this.simulationService.executeFunction('apagar');
  }

  iniciaSimulacao(): void {
    this.execucaoAnimacao++;
    this.animandoFilaBasica.set(false);
    this.fila1V.set([]);
    this.resultados.set([]);
    this.processoAtual = 0;
    this.processosVisiveis.set([]);
    this.fila1Estatica.set([]);
    this.fila2Estatica.set([]);
    this.fila3Estatica.set([]);
    this.fila4Estatica.set([]);
    this.auxFilaApto = [];

    const arrumalista = new ListaProcessos(this.listaProcessos);

    if (this.listaProcessos.length === 0) {
      this.mostrarNotificacao('Adicione Processos!');
      return;
    }

    const escalonador = this.escalonador.valueOf();

    if (escalonador === 0) {
      this.resultados.set(this.escalonamentoService.simulaFifo(this.listaProcessos));
      this.resultados2.set(arrumalista.tabelaResultado(this.listaProcessos));
    } else if (escalonador === 1) {
      this.resultados.set(this.escalonamentoService.simulaSJF(this.listaProcessos));
      this.resultados2.set(arrumalista.tabelaResultado(this.listaProcessos));
    } else if (escalonador === 2) {
      if (this.escalonamentoService.validarPrio(this.listaProcessos)) {
        this.resultados.set(this.escalonamentoService.simulaPrio(this.listaProcessos));
        this.resultados2.set(arrumalista.tabelaResultado(this.listaProcessos));
      } else {
        this.mostrarNotificacao('Há processos sem Prioridade');
      }
    } else if (escalonador === 3) {
      if (this.escalonamentoService.validarPrio(this.listaProcessos)) {
        this.resultados.set(this.escalonamentoService.simulaPrioPremp(this.listaProcessos));
        this.resultados2.set(arrumalista.tabelaResultado(this.listaProcessos));
      } else {
        this.mostrarNotificacao('Há processos sem Prioridade');
      }
    } else if (escalonador === 4) {
      this.resultados.set(this.escalonamentoService.simulaRR(this.listaProcessos, this.quantum.valueOf()));
      this.resultados2.set(arrumalista.tabelaResultado(this.listaProcessos));
    } else if (escalonador > 4) {
      if (this.escalonamentoService.validarPrio(this.listaProcessos)) {
        const { resultado, filaApto, tabelaResultados } = this.escalonamentoService.simulaMF(
          this.listaProcessos,
          {
            filaRR1: this.filaRR1 ?? false,
            filaRR2: this.filaRR2 ?? false,
            filaRR3: this.filaRR3 ?? false,
            filaRR4: this.filaRR4 ?? false,
            quantum: this.quantum?.valueOf() ?? 0,
            quantum1: this.quantum1?.valueOf() ?? 0,
            quantum2: this.quantum2?.valueOf() ?? 0,
            quantum3: this.quantum3?.valueOf() ?? 0,
          }
        );
        this.resultados.set(resultado);
        this.auxFilaApto = filaApto;
        const lista = new ListaProcessos(tabelaResultados);
        this.resultados2.set(lista.tabelaResultado(tabelaResultados));
      } else {
        this.mostrarNotificacao('Há processos sem Prioridade');
      }
    }

    this.aptos(this.resultados());

    if (!this.animacao && escalonador < 5) {
      this.exibeProcessos();
    } else if (!this.animacao && escalonador > 4) {
      this.animacaoFilaApto();
    }
  }

  mostrarNotificacao(mensagem: string): void {
    this.notifi.open(mensagem, 'Fechar', { duration: 2000 });
  }

  async exibeProcessos(): Promise<void> {
    const res = this.resultados();
    const execucao = this.execucaoAnimacao;
    const escalonador = this.escalonador.valueOf();
    // Nos quatro algoritmos básicos a fila de aptos também é animada (entradas e saídas).
    const animarFila = escalonador < 4;
    const filaPorTempo = animarFila ? this.filaAptosPorTempo(res) : [];
    if (animarFila) this.animandoFilaBasica.set(true);

    for (this.processoAtual = 0; this.processoAtual < res.length; this.processoAtual++) {
      await this.sleep(1000);
      if (execucao !== this.execucaoAnimacao) return; // simulação cancelada ou reiniciada
      this.processosVisiveis.update(v => [...v, res[this.processoAtual]]);
      if (animarFila) this.fila1V.set(filaPorTempo[this.processoAtual]);
    }

    if (animarFila && execucao === this.execucaoAnimacao) {
      await this.sleep(1000);
      if (execucao !== this.execucaoAnimacao) return;
      // Ao final, a fila mostra todos os processos na ordem em que foram atendidos.
      this.fila1V.set([]);
      this.animandoFilaBasica.set(false);
    }
  }

  /**
   * Reconstrói a fila de aptos em cada instante a partir do diagrama da CPU:
   * um processo está apto se já chegou, ainda tem execução restante e não está na CPU.
   * A ordem é a de entrada na fila (chegada ou retorno após ser interrompido).
   */
  private filaAptosPorTempo(res: ResultadoCpu[]): { nome: string; cor: string }[][] {
    const dados = new Map(this.listaProcessos.map(p => [p.nome, p]));
    const executado = new Map<string, number>();
    const ultimaExecucao = new Map<string, number>();
    const filas: { nome: string; cor: string }[][] = [];

    for (let t = 0; t < res.length; t++) {
      const naCpu = res[t].nome;
      const aptos: { nome: string; cor: string; entrada: number; retorno: boolean; chegada: number }[] = [];

      for (const p of dados.values()) {
        const restante = (p.execucao ?? 0) - (executado.get(p.nome) ?? 0);
        if (p.chegada > t || restante <= 0 || p.nome === naCpu) continue;
        const ultima = ultimaExecucao.get(p.nome);
        const retorno = ultima !== undefined;
        aptos.push({
          nome: p.nome,
          cor: p.cor,
          entrada: retorno ? Math.max(p.chegada, ultima! + 1) : p.chegada,
          retorno,
          chegada: p.chegada,
        });
      }

      aptos.sort((a, b) =>
        a.entrada - b.entrada ||
        Number(a.retorno) - Number(b.retorno) ||
        a.chegada - b.chegada ||
        a.nome.localeCompare(b.nome));
      filas.push(aptos.map(a => ({ nome: a.nome, cor: a.cor })));

      if (naCpu !== '-') {
        executado.set(naCpu, (executado.get(naCpu) ?? 0) + 1);
        ultimaExecucao.set(naCpu, t);
      }
    }
    return filas;
  }

  aptos(resultado: ResultadoCpu[]): void {
    if (!resultado) return;
    let aux: string | null = null;
    const escalonador = this.escalonador.valueOf();

    for (const processo of resultado) {
      if (processo.nome !== aux && processo.nome !== '-') {
        aux = processo.nome;
        const p = Object.assign({}, processo);

        if (!(escalonador > 4) || p.prioridade === 0) {
          this.fila1Estatica.update(v => [...v, p]);
        } else if (p.prioridade === 1) {
          this.fila2Estatica.update(v => [...v, p]);
        } else if (p.prioridade === 2) {
          this.fila3Estatica.update(v => [...v, p]);
        } else if (p.prioridade === 3) {
          this.fila4Estatica.update(v => [...v, p]);
        }
      }
    }
  }

  ordenaFilaAptosEntradaSaida() {
    this.auxFilaAptoEntrada = [...this.auxFilaApto];
    this.auxFilaAptoSaida = [...this.auxFilaApto];

    this.auxFilaAptoEntrada.sort((a, b) =>
      a.entrouNaFila < b.entrouNaFila ? -1 : a.entrouNaFila > b.entrouNaFila ? 1 : 0);

    this.auxFilaAptoSaida.sort((a, b) =>
      a.saiuDaFila < b.saiuDaFila ? -1 : a.saiuDaFila > b.saiuDaFila ? 1 : 0);
  }

  async animacaoFilaApto() {
    this.ordenaFilaAptosEntradaSaida();
    const res = this.resultados();

    if (res.length > 0) {
      this.processosVisiveis.update(v => [...v, res[0]]);
    }

    for (this.tempoCpu = 1; this.tempoCpu < res.length; this.tempoCpu++) {
      await this.sleep(1000);

      this.processoAtual++;
      if (this.processoAtual < res.length) {
        this.processosVisiveis.update(v => [...v, res[this.processoAtual]]);
      }

      for (let e = 0; e < this.auxFilaAptoEntrada.length; e++) {
        if (this.auxFilaAptoEntrada[e].entrouNaFila > this.tempoCpu) break;
        const entrada = this.auxFilaAptoEntrada[e];
        if (entrada.entrouNaFila === this.tempoCpu) {
          const item = { nome: entrada.nome, cor: entrada.cor };
          if (entrada.prioridade === 0) this.fila1V.update(v => [...v, item]);
          else if (entrada.prioridade === 1) this.fila2V.update(v => [...v, item]);
          else if (entrada.prioridade === 2) this.fila3V.update(v => [...v, item]);
          else this.fila4V.update(v => [...v, item]);
        }
      }

      for (let s = 0; s < this.auxFilaAptoSaida.length; s++) {
        if (this.auxFilaAptoSaida[s].saiuDaFila > this.tempoCpu) break;
        const saida = this.auxFilaAptoSaida[s];
        if (saida.saiuDaFila === this.tempoCpu) {
          if (saida.prioridade === 0) this.fila1V.update(v => v.slice(1));
          else if (saida.prioridade === 1) this.fila2V.update(v => v.slice(1));
          else if (saida.prioridade === 2) this.fila3V.update(v => v.slice(1));
          else this.fila4V.update(v => v.slice(1));
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
