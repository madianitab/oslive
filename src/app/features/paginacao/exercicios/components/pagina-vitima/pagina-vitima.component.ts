import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { FCFS } from 'src/app/features/paginacao/models/fcfs';
import { HitoricoBitReferencia } from 'src/app/features/paginacao/models/historico-bit-referencia';
import { SegundaChance } from 'src/app/features/paginacao/models/segunda-chance';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { Pagina } from 'src/app/features/paginacao/models/pagina';
import { Utils } from 'src/app/core/utils';
import { TAM, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, TIMESTAMP_INICIAL, STR_BIT_ESTADO } from 'src/app/core/constantes';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-pagina-vitima',
    templateUrl: './pagina-vitima.component.html',
    styleUrls: ['./pagina-vitima.component.css'],
    standalone: true,
    imports: [FormsModule]
})
export class PaginaVitimaComponent implements OnInit, OnChanges{

  @Input() public algoritmoSelecionado: Number = new Number;
  @Input() public listaProcessos: Array<Processo> = [];
  @Input() public recursoTecnico: Number = new Number;

  @Output() public enviarBack:EventEmitter<any> = new EventEmitter();
  
  public title: string = "Determine a Página Vítima";
  public algoritmoEscalonamento: Array<string> =[
    "Exercício com FCFS (first-come-first-served)",
    "Exercício com Histórico de bits de referência",
    "Exercício com Segunda Chance",
    ];

  TAM: number = TAM;
  timestamp:number = TIMESTAMP_INICIAL;
  strMemoFisicaCor: string = MEMORIA_FISICA_COR;
  strMemoVazia: string = STR_MEMORIA_VAZIA;
  arrayOrdem:Array<number> = [];
  
  back: Number =0;
  visualizarResposta:boolean = false;

  corrigir: boolean = false;
  paginavitima: number = 0;
  secureNumberAlgo: number = 0;
  segundaChance = true;
  resposta: number = 50;

  public memoriaF: Array<MemoriaFisica> = [];
  public filaDePaginas: Array<Pagina> = [];

  public algoritmoFCFS = new FCFS();
  public algoritmoHistorico = new HitoricoBitReferencia();
  public algoritmoSegundaChance = new SegundaChance();
  
  constructor() { }

  ngOnInit(): void {
    this.preencherMemoriaFisica();
  }

  ngOnChanges(): void {
    this.resposta = 50;
    if( this.algoritmoSelecionado == 0 || this.algoritmoSelecionado == 1 || this.algoritmoSelecionado == 2){
      this.secureNumberAlgo = this.algoritmoSelecionado.valueOf();
    }
    this.preencherMemoriaFisica();
  }

  preencherMemoriaFisica(){
    this.arrayOrdem  = Utils.embaralhamentoFisherYates(Utils.listaNum(TAM));
    this.memoriaF = [];
    this.filaDePaginas = [];

    this.algoritmoFCFS =  new FCFS();
    this.algoritmoSegundaChance = new SegundaChance();
    this.algoritmoHistorico = new HitoricoBitReferencia();

    this.corrigir = false;
    this.segundaChance = true;
    
    // cria Lista de Paginas
    for(let item of this.listaProcessos){
      for(let i of item.pagina){
        i.indiceMemoriaFisica = -1;
        i.timeStamp=0;
        this.filaDePaginas.push(i);
      }
    }

    // cria os espaços na memória Fisica
    for(var i:number =0; i<this.TAM; i++){
      this.memoriaF.push(new MemoriaFisica(i, this.strMemoVazia, this.strMemoFisicaCor,  0));
    }

    // Embaralha a lista de processos a serem alocados ->em seguida os aloca
    if(this.filaDePaginas.length>=this.TAM){
        var ordemAleatoriaPaginas: Array<number> = Utils.embaralhamentoFisherYates(Utils.listaNum(this.filaDePaginas.length));
        for(var i = 0; i<this.TAM;i++){
            this.alocaPaginaEmMemoriaFisica(this.filaDePaginas[ordemAleatoriaPaginas[i]]);
            if(this.algoritmoSelecionado==2)this.algoritmoSegundaChance.bitReferencia[i] = this.algoritmoSegundaChance.bitReferencia[i]==0 ?1 :0;
        }
    }
    
    if(this.algoritmoSelecionado == 0){
      this.paginavitima = 0;
    }

    else if(this.algoritmoSelecionado == 1){
      this.paginavitima = this.algoritmoHistorico.verificaBitReferencia();
    }

    else if(this.algoritmoSelecionado == 2 && this.algoritmoSegundaChance.lista.length > 0){
      this.paginavitima = this.algoritmoSegundaChance.paginaVitimaEscolhida();
    }
  }
  
  alocaPaginaEmMemoriaFisica(pagX: Pagina):boolean{

    if(this.algoritmoSelecionado==0){
      this.algoritmoFCFS.addPaginaEmMemoriaFisica(this.memoriaF, pagX, this.timestamp);
    }
    else if(this.algoritmoSelecionado==1){
      this.algoritmoHistorico.addPaginaEmMemoriaFisica(this.memoriaF, pagX, this.timestamp);
    }
    else{
      this.algoritmoSegundaChance.addPaginaEmMemoriaFisica(this.memoriaF, pagX,  this.timestamp);
    }
    this.timestamp+=1;
    return true;
  }
  
  desalocaPaginaEmMemoriaFisica(proc: Pagina):boolean{
      var i: number = 0;

      if(this.algoritmoSelecionado==0){
        i = this.algoritmoFCFS.removerProcesso(this.memoriaF, proc);
      }
      else if(this.algoritmoSelecionado==1){
        i = this.algoritmoHistorico.removerProcesso(this.memoriaF, proc);
      }
      else{
        i = this.algoritmoSegundaChance.removerProcesso(this.memoriaF, proc);
      }

      if(i!=-1)return true;
      return false;
    }

  correcao():void{
    
      if(this.resposta != this.paginavitima && this.segundaChance) {
        this.segundaChance = false;
      }
      else{
        this.corrigir=!this.corrigir;
        if(!this.corrigir)this.segundaChance = true;
      }
  }

  visualizarRespostaExercicio():void{
    this.visualizarResposta=!this.visualizarResposta;
    if(this.visualizarResposta)this.corrigir=true;
    else this.corrigir=false;
  }
  reiniciar():void{
    this.back = this.back == 1 ? 2 : 1;
    this.enviarBack.emit(this.back);
  }

  counter(i: number) {
    return new Array(i);
  }

  statusBitRef(_num: number):void{
    this.corrigir=false;
    this.algoritmoSegundaChance.bitReferencia[_num] = this.algoritmoSegundaChance.bitReferencia[_num] == 0 ? 1 : 0;
    
    this.paginavitima = this.algoritmoSegundaChance.paginaVitimaEscolhida();
  }

  verificaGabarito():void{
    if(this.resposta == this.paginavitima && this.segundaChance) {
      this.segundaChance = false;
    }
  }
}
