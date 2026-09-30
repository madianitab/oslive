import { Component, OnInit } from '@angular/core';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { FIFO } from 'src/app/features/paginacao/models/fifo';
import { MenuLateralComponent } from '../menu-lateral/menu-lateral.component';

import { AreaExercicioComponent } from '../area-exercicio/area-exercicio.component';
import { PaginaVitimaComponent } from '../pagina-vitima/pagina-vitima.component';
import { InfortivoComponent } from '../infortivo/infortivo.component';
import { OsSimShellComponent } from 'src/app/ui/sim-shell/sim-shell.component';

@Component({
    selector: 'app-home-paginacao-por-demanda-exercicios',
    templateUrl: './home-paginacao-por-demanda-exercicios.component.html',
    styleUrls: ['./home-paginacao-por-demanda-exercicios.component.css'],
    standalone: true,
    imports: [MenuLateralComponent, AreaExercicioComponent, PaginaVitimaComponent, InfortivoComponent, OsSimShellComponent]
})
export class HomePaginacaoPorDemandaExerciciosComponent implements OnInit {
  public getDadosProcesso: Array<Processo> = [];
  public getDadosPaginas: FIFO = new FIFO();
  public getTipoExercicio: Number = new Number;
  public getTipoAlgoritmo: Number = new Number;
  public getRecursoTecnico: Number = new Number;
  public getRespostaMemoriaLogica: Array<Processo> = [];
  public getBack: Number = new Number;
  public qtdPaginas = 0;

  title = 'OSlive-Ex-paginacao-por-demanda';

  ngOnInit(): void {
  }
  public setTipoAlgoritmo(event:number){
          this.getTipoAlgoritmo = event;
        } 
  public setRecursoTecnico(event:number){
          this.getRecursoTecnico = event;
        } 

  public setBack(event:number){
    this.getBack = event;
  } 

  public setTipoExercicio(event:number){
          this.getTipoExercicio = event;
          } 

  public setDadosProcesso(event:Array<Processo>){
        this.getDadosProcesso = event;
        this.qtdPaginas = 0;
          for(let i of this.getDadosProcesso){
            this.qtdPaginas+=i.pagina.length;
          }
        } 

  public setDadosMemoriaFisica(event:FIFO){
        this.getDadosPaginas = event;
        } 

public setRespostaMemoriaLogica(event:Array<Processo>){
          this.getRespostaMemoriaLogica = [];
          this.getRespostaMemoriaLogica = event;
        } 

}
