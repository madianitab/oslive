import { Component, OnInit } from '@angular/core';
import { Processo } from 'src/app/features/escalonamento/models/processo';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';
import { LateralEscalonamentoComponent } from '../lateral-escalonamento/lateral-escalonamento.component';
import { AreaSimulacaoComponent } from '../area-simulacao/area-simulacao.component';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';
import { OsButtonGroupComponent } from 'src/app/ui/button-group/button-group.component';

@Component({
    selector: 'app-home-escalonamento',
    templateUrl: './home-escalonamento.component.html',
    styleUrls: ['./home-escalonamento.component.css'],
    standalone: true,
    imports: [LateralEscalonamentoComponent, AreaSimulacaoComponent, OsSimShellComponent, OsButtonGroupComponent]
})
export class HomeEscalonamentoComponent implements OnInit {
  public getDadosProcesso: Array<Processo> = [];
  public getTipoAlgoritmo: Number = new Number;
  public getTemAnimacao?: Boolean | null;
  public getQuantum: Number = new Number;
  public getQuantum1: Number = new Number;
  public getQuantum2: Number = new Number;
  public getQuantum3: Number = new Number;
  public getFilaRR1?: boolean | null;
  public getFilaRR2?: boolean | null;
  public getFilaRR3?: boolean | null;
  public getFilaRR4?: boolean | null;


  ngOnInit(): void {

  }

  public setFilaRR1(event: boolean) {
    this.getFilaRR1 = event;
  }

  public setFilaRR2(event: boolean) {
    this.getFilaRR2 = event;
  }

  public setFilaRR3(event: boolean) {
    this.getFilaRR3 = event;
  }

  public setFilaRR4(event: boolean) {
    this.getFilaRR4 = event;
  }

  public setQuantum(event: Number) {
    this.getQuantum = event;
  }

  public setQuantum1(event: Number) {
    this.getQuantum1 = event;
  }

  public setQuantum2(event: Number) {
    this.getQuantum2 = event;
  }

  public setQuantum3(event: Number) {
    this.getQuantum3 = event;
  }


  public setDadosProcesso(event: Array<Processo>) {
    this.getDadosProcesso = event;
  }

  public setTipoAlgoritmo(event: Number) {
    this.getTipoAlgoritmo = event;
  }

  public setAnimcao(event: boolean) {
    this.getTemAnimacao = event;
  }

  constructor() {}
}
