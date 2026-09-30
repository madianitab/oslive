import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { Processo } from 'src/app/features/escalonamento/models/processo';
import { gera_cor } from 'src/app/core/utils';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';

@Component({
    selector: 'app-lateral-escalonamento',
    templateUrl: './lateral-escalonamento.component.html',
    styleUrls: ['./lateral-escalonamento.component.css'],
    standalone: true,
    imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent]
})
export class LateralEscalonamentoComponent implements OnInit {

  @Input() public back: Number = new Number;

  @Output() public enviarProcessos: EventEmitter<any> = new EventEmitter();
  @Output() public enviarTipoAlgoritmo: EventEmitter<any> = new EventEmitter();
  @Output() public temAnimacao: EventEmitter<any> = new EventEmitter();
  @Output() public enviarQuantum: EventEmitter<any> = new EventEmitter();
  @Output() public enviarQuantum1: EventEmitter<any> = new EventEmitter();
  @Output() public enviarQuantum2: EventEmitter<any> = new EventEmitter();
  @Output() public enviarQuantum3: EventEmitter<any> = new EventEmitter();
  @Output() public enviarFilaRR1: EventEmitter<any> = new EventEmitter();
  @Output() public enviarFilaRR2: EventEmitter<any> = new EventEmitter();
  @Output() public enviarFilaRR3: EventEmitter<any> = new EventEmitter();
  @Output() public enviarFilaRR4: EventEmitter<any> = new EventEmitter();

  public processo: Processo = new Processo("", 0, null, null, " ");
  public aleatorio = signal<boolean>(false);
  public geraAleatorio: boolean = true;
  public eBack: Number = 0;
  public listaProcessos = signal<Processo[]>([]);
  public algoritmoEscalonamento: Array<{ tipo: string, exec: number }> = [
    { tipo: "FIFO (First In, First Out)", exec: 0 },
    { tipo: "SJF (Shortest Job First)", exec: 1 },
    { tipo: "Prioridade (Não Preemptiva)", exec: 2 },
    { tipo: "Prioridade (Preemptiva)", exec: 3 },
    { tipo: "RR (Round Robin)", exec: 4 },
    { tipo: "Múltiplas Filas (2 Filas)", exec: 5 },
    { tipo: "Múltiplas Filas (3 Filas)", exec: 6 },
    { tipo: "Múltiplas Filas (4 Filas)", exec: 7 },
  ];
  public escalonador: { tipo: string, exec: number } = { tipo: "", exec: 0 };

  public fila1fifo: boolean = true;
  public fila1RR: boolean = false;
  public fila2fifo: boolean = true;
  public fila2RR: boolean = false;
  public fila3fifo: boolean = true;
  public fila3RR: boolean = false;
  public fila4fifo: boolean = true;
  public fila4RR: boolean = false;

  public temPrioridade: boolean = false;

  public quantum: Number = 3;
  public quantum1: Number = 3;
  public quantum2: Number = 3;
  public quantum3: Number = 3;

  public qtFilas: Number = 1;

  public editar = signal<boolean>(false);
  public processoSelecionado = signal<number | null>(null);

  public prioridadeFila: string = "info";
  public animacao = signal<boolean>(false);
  public nomeProcessoExiste = signal<boolean>(false);



  ngOnInit(): void {
    this.editar.set(false);
  }

  ngOnChanges(): void {
    this.enviarFilas()
    if (this.eBack != this.back.valueOf()) {
      this.eBack = this.back.valueOf();
      this.enviarTipoAlgoritmo.emit(this.escalonador.exec);
      this.enviarProcessos.emit(this.listaProcessos());
      this.temAnimacao.emit(this.animacao());
    }
  }

  escalonadorSelecionado(event: any) {
    this.escalonador.tipo = this.algoritmoEscalonamento[this.escalonador.exec.valueOf()].tipo;
    this.escalonador.exec = this.algoritmoEscalonamento[this.escalonador.exec.valueOf()].exec;

    this.enviarTipoAlgoritmo.emit(this.escalonador.exec);
    if (this.escalonador.exec < 5) {
      this.setFILAS()
    };
    if (this.escalonador.exec == 5) {
      this.qtFilas = 2;
    } else if (this.escalonador.exec == 6) {
      this.qtFilas = 3;
    } else if (this.escalonador.exec == 7) {
      this.qtFilas = 4;
    }
  }


  setFILAS() {
    this.fila1RR = false;
    this.fila1fifo = true;
    this.fila2RR = false;
    this.fila2fifo = true;
    this.fila3RR = false;
    this.fila3fifo = true;
    this.fila4RR = false;
    this.fila4fifo = true;
  }


  salvarProcesso(): void {
    const nomeProcesso = this.processo.nome.toUpperCase();
    const nomeJaExiste = this.listaProcessos().some(processo => processo.nome === nomeProcesso);
    const tempoChegada = this.processo.chegada;
    const tempoJaExiste = this.listaProcessos().some(processo => processo.chegada === tempoChegada);
    if (this.processo.nome !== '' && this.processo.execucao != null) {
      if (nomeJaExiste && !this.editar()) {
        this.mostrarNotificacao('Um processo com esse nome já existe!');
      } else if (this.processoSelecionado() !== null && this.listaProcessos()[this.processoSelecionado()!].chegada != this.processo.chegada || (tempoJaExiste && !this.editar())) {
        this.mostrarNotificacao('Já existe um processo com esse tempo de chegada!');
      } else {
        if (this.editar() && this.processoSelecionado() !== null) {
          this.processo.nome = this.processo.nome.toUpperCase();
          this.listaProcessos.update(list => {
            list[this.processoSelecionado()!] = this.processo;
            return [...list];
          });
          this.editar.set(false);
        } else {
          this.processo.nome = nomeProcesso.toUpperCase();
          this.processo.cor = gera_cor();
          this.listaProcessos.update(list => [...list, this.processo]);
        }
        this.processo = new Processo('', 0, null, null, '');
        this.processoSelecionado.set(null);
        this.ordenarPorTempoDeChegada();
        this.enviarProcessos.emit(this.clonarListaProcessos(this.listaProcessos()));
        this.enviarFilas();
      }
    } else {
      if (this.processo.nome == '') {
        this.mostrarNotificacao('Nome do Processo está vazio!!');
      } else if (this.processo.execucao == null) {
        this.mostrarNotificacao('O tempo de execução do Processo está vazio!!');
      }
    }
  }


  iniciarEdicao(processo: Processo, index: number): void {
    this.processo = processo.clone();
    this.processoSelecionado.set(index);
    this.editar.set(true);
    this.aleatorio.set(false);
  }

  limparForm(): void {
    this.processo = new Processo('', 0, null, null, '');
    this.editar.set(false);
    this.processoSelecionado.set(null);
  }

  excluir(index: number): void {
    if (index > -1 && index < this.listaProcessos().length) {
      this.listaProcessos.update(list => {
        const updated = [...list];
        updated.splice(index, 1);
        return updated;
      });
    }
  }

  ordenarPorTempoDeChegada(): void {
    this.listaProcessos.update(list => [...list].sort((a, b) => a.chegada - b.chegada));
  }


  geradorAleatorio(): void {
    this.listaProcessos.set([]);
    const listNomes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
    const listTempoChegada = [0];
    const filas: Processo[][] = [[], [], [], []];

    let qtdProcessos = this.qtFilas.valueOf() > 1 ? parseInt(this.qtFilas.toString()) * 4 : 4;


    for (let i = 0; i < qtdProcessos; i++) {

      let processo = new Processo(listNomes[i], 0, null, null, gera_cor(this.listaProcessos()));
      if (i !== 0) {
        let aux = true;
        processo.chegada = Math.round(Math.random() * (this.qtFilas.valueOf() > 3 ? 16 : 10));
        while (listTempoChegada.includes(processo.chegada)) {
          processo.chegada = aux ? processo.chegada + 1 : Math.round(Math.random() * (this.qtFilas.valueOf() > 3 ? 16 : 10));
          aux = !aux;
        }
      }
      listTempoChegada.push(processo.chegada);
      if (!(this.qtFilas.valueOf() > 1))
        processo.prioridade = Math.round(Math.random() * 1);
      else {
        processo.prioridade = Math.abs(Math.round(Math.random() * this.qtFilas.valueOf() - 1));
        while (filas[processo.prioridade].length == 4) {
          processo.prioridade = Math.abs(Math.round(Math.random() * this.qtFilas.valueOf() - 1));
        }
      }
      processo.execucao = Math.round(Math.random() * 7) + 1;
      this.listaProcessos.update(list => [...list, processo]);
      filas[processo.prioridade].push(processo);
    }
    this.quantum = Math.round(Math.random() * 2) + 1;
    if (this.escalonador.exec > 1)
      this.quantum1 = Math.round(Math.random() * 2) + 1;
    if (this.escalonador.exec > 2)
      this.quantum2 = Math.round(Math.random() * 2) + 1;
    if (this.escalonador.exec > 3)
      this.quantum3 = Math.round(Math.random() * 2) + 1;
    this.limparForm();
    this.ordenarPorTempoDeChegada();
    this.enviarProcessos.emit(this.clonarListaProcessos(this.listaProcessos()));
    this.enviarQuantums();
    this.enviarFilas();
  }

  enviaAnimacao(): void {
    this.temAnimacao.emit(this.animacao());
  }

  simular(): void {
    this.enviarQuantums();
    this.enviarFilas();
    this.enviarProcessos.emit(this.clonarListaProcessos(this.listaProcessos()));
    this.simulationService.executeFunction('iniciaSimulacao');
  }

  onQuantumChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value) {
      const quantumNumber = new Number(value);
      if (!isNaN(quantumNumber.valueOf())) {
        this.enviarQuantum.emit(quantumNumber);
      }
    }
  }

  onQuantumChange1(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value) {
      const quantumNumber = new Number(value);
      if (!isNaN(quantumNumber.valueOf())) {
        this.enviarQuantum1.emit(quantumNumber);
      }
    }
  }

  onQuantumChange2(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value) {
      const quantumNumber = new Number(value);
      if (!isNaN(quantumNumber.valueOf())) {
        this.enviarQuantum2.emit(quantumNumber);
      }
    }
  }

  onQuantumChange3(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value) {
      const quantumNumber = new Number(value);
      if (!isNaN(quantumNumber.valueOf())) {
        this.enviarQuantum3.emit(quantumNumber);
      }
    }
  }

  clonarListaProcessos(listaProcessos: Processo[]): Processo[] {
    return listaProcessos.map(processo => processo.clone());

  }

  cancel_simulacao(): void {
    this.simulationService.executeFunction('cancelar');
  }

  reiniciar_simulacao(): void {
    window.location.reload();
  }

  mostrarNotificacao(mensagem: string): void {
    this.notifi.open(mensagem, 'Fechar', {
      duration: 2000,
    });
  }

  enviarQuantums(): void {
    this.enviarQuantum.emit(new Number(this.quantum.valueOf()));
    this.enviarQuantum1.emit(new Number(this.quantum1.valueOf()));
    this.enviarQuantum2.emit(new Number(this.quantum2.valueOf()));
    this.enviarQuantum3.emit(new Number(this.quantum3.valueOf()));
  }

  enviarFilas(): void {
    this.enviarFilaRR1.emit(this.fila1RR);
    this.enviarFilaRR2.emit(this.fila2RR);
    this.enviarFilaRR3.emit(this.fila3RR);
    this.enviarFilaRR4.emit(this.fila4RR);
  }

  onCheckboxChange(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.enviarFilas()
    }
  }

  constructor(
    private simulationService: Comunicacao,
    private notifi: MatSnackBar,
    ){}
}
