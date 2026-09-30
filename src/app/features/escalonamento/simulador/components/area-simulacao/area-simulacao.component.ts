import { Component, Input, OnInit, signal } from '@angular/core';
import { Processo } from 'src/app/features/escalonamento/models/processo';
import { ListaProcessos } from 'src/app/features/escalonamento/models/lista-processos';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EscalonamentoService, ResultadoCpu } from 'src/app/features/escalonamento/services/escalonamento.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgStyle } from '@angular/common';
import { GraficoComponent } from '../grafico/grafico.component';

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
    GraficoComponent
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
    for (this.processoAtual = 0; this.processoAtual < res.length; this.processoAtual++) {
      await this.sleep(1000);
      this.processosVisiveis.update(v => [...v, res[this.processoAtual]]);
    }
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
