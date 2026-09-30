import { Component, OnInit } from '@angular/core';
import { ProcessoSegmentado } from 'src/app/features/segmentacao/models/processo-segmentado';
import { TabelaSegmentos } from 'src/app/features/segmentacao/models/tabela-segmentos';
import { MenuLateralSegmentacaoComponent } from '../menu-lateral-segmentacao/menu-lateral-segmentacao.component';
import { AreaExercicioSegmentacaoComponent } from '../area-exercicio-segmentacao/area-exercicio-segmentacao.component';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-home-exercicio-de-segmentacao',
    templateUrl: './home-exercicio-de-segmentacao.component.html',
    styleUrls: ['./home-exercicio-de-segmentacao.component.css'],
    standalone: true,
    imports: [MenuLateralSegmentacaoComponent, AreaExercicioSegmentacaoComponent, RouterOutlet]
})
export class HomeExercicioDeSegmentacaoComponent implements OnInit {
  public getDadosProcesso: Array<ProcessoSegmentado> = [];
  public getTabelaSegmentos: TabelaSegmentos = new TabelaSegmentos();
  public getTipoExercicio: number = 0;
  public getRecursoTecnico: number = 0;
  public getRespostaMemoriaLogica: Array<ProcessoSegmentado> = [];
  public getBack: number = 0;
  public qtdSegmentos = 0;

  title = 'OSlive-Ex-segmentacao';

  ngOnInit(): void {}

  public setTipoExercicio(event: number) {
    this.getTipoExercicio = event;
  }

  public setRecursoTecnico(event: number) {
    this.getRecursoTecnico = event;
  }

  public setBack(event: number) {
    this.getBack = event;
  }

  public setDadosProcesso(event: Array<ProcessoSegmentado>) {
    this.getDadosProcesso = event;
    this.qtdSegmentos = 0;
    for (let proc of this.getDadosProcesso) {
      this.qtdSegmentos += proc.segmentos.length;
    }
  }

  public setTabelaSegmentos(event: TabelaSegmentos) {
    this.getTabelaSegmentos = event;
  }

  public setRespostaMemoriaLogica(event: Array<ProcessoSegmentado>) {
    this.getRespostaMemoriaLogica = [...event];
  }
  
  segmentos = {
    codigo: 0,
    dados: 0,
    pilha: 0
  };

  atualizarSegmentos(event: { codigo: number, dados: number, pilha: number }) {
    this.segmentos = event;
  }
}