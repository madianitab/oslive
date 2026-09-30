import { Component, EventEmitter, Input, OnChanges, OnInit, Output, signal } from '@angular/core';
import { Utils } from 'src/app/core/utils';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-menu-lateral',
    templateUrl: './menu-lateral.component.html',
    styleUrls: ['./menu-lateral.component.css'],
    standalone: true,
    imports: [FormsModule, NgClass]
})

export class MenuLateralComponent implements OnInit, OnChanges {

  @Input() public back: Number = new Number;

  @Output() public enviarRespostaMemoriaLogica:EventEmitter<any> = new EventEmitter();
  @Output() public enviarDados:EventEmitter<any> = new EventEmitter();
  
  @Output() public enviarTipoExercicio:EventEmitter<any> = new EventEmitter();
  @Output() public enviarTipoAlgoritmo:EventEmitter<any> = new EventEmitter();

  @Output() public enviarRecursoTecnico:EventEmitter<any> = new EventEmitter();

  public aleatorio = signal<boolean>(true);
  public geraAleatorio: boolean = true;
  public nProcessos = signal<number>(4);
  public eRecursoTecnico: number = 1;
  public eBack:Number=0;
  public PaginaVitimaCondicaoMinima = signal<boolean>(false);


  public listaProcessos = signal<Processo[]>([]);
  public respostaMemoriaLogica = signal<Processo[]>([]);
  public listaNomes: Array<{nome:string, exec: number}> = [
                                                            {nome:"A", exec: 1},
                                                            {nome:"B", exec: 1},
                                                            {nome:"C", exec: 1},
                                                            {nome:"D", exec: 1},
                                                          ];
  public listaDeExercicios: Array<{tipo:string, exec: Number}> =[
                            {tipo:"Preencher Memória Lógica", exec: 1},
                            {tipo:"Preencher Memória Fisica", exec: 2},
                            {tipo:"Determinar Página Vítima", exec: 3},
                          ];//{tipo:"Sequência de Alocação da Memória Física", exec: 0},
  public algoritmoEscalonamento: Array<{tipo:string, exec: Number}> =[
                            {tipo:"FCFS (first-come-first-served)", exec: 0},
                            {tipo:"Histórico de bits de referência", exec: 1},
                            {tipo:"Segunda Chance", exec: 2},
                          ];

  public exercicioSelecionado:{tipo:string, exec: Number} = {tipo:"", exec: 1};
  public escalonador: {tipo:string, exec: Number} = {tipo:"", exec: 0};

  
  
  ngOnInit(): void {
    this.enviarTipoExercicio.emit(this.exercicioSelecionado.exec);
    this.enviarTipoAlgoritmo.emit(0);
    this.enviarRecursoTecnico.emit(0);
  }

  ngOnChanges(): void {
    if(this.eBack != this.back.valueOf()){
      this.eBack = this.back.valueOf();
      this.listaProcessos.set([]);
      this.respostaMemoriaLogica.set([]);
      this.exercicioSelecionado = {tipo:"Preencher Memória Lógica", exec: 1};
      this.enviarTipoExercicio.emit(1);
      this.enviarRespostaMemoriaLogica.emit(this.respostaMemoriaLogica());
      this.enviarDados.emit(this.listaProcessos());
      this.aleatorio.set(true);
    }
  }

  escolheExercicio(event:any){
    this.exercicioSelecionado.tipo = this.listaDeExercicios[this.exercicioSelecionado.exec.valueOf()-1].tipo;
    this.exercicioSelecionado.exec = this.listaDeExercicios[this.exercicioSelecionado.exec.valueOf()-1].exec;

    this.enviarTipoExercicio.emit(this.exercicioSelecionado.exec);
    this.eRecursoTecnico = this.eRecursoTecnico ==1? 0 : 1;
    this.enviarRecursoTecnico.emit(this.eRecursoTecnico);

    this.PaginaVitimaCondicaoMinima.set(this.exercicioSelecionado.exec == 3 && Utils.quantPaginas(this.listaProcessos()) < 8);
  }

  escolheEscalonador(event:any){
    this.escalonador.tipo = this.algoritmoEscalonamento[this.escalonador.exec.valueOf()].tipo;
    this.escalonador.exec = this.algoritmoEscalonamento[this.escalonador.exec.valueOf()].exec;
    this.enviarTipoAlgoritmo.emit(this.escalonador.exec);
    
    this.eRecursoTecnico = this.eRecursoTecnico ==1? 0 : 1;
    this.enviarRecursoTecnico.emit(this.eRecursoTecnico);
  }
  
  geradorAleatorio():void{

      this.PaginaVitimaCondicaoMinima.set(this.exercicioSelecionado.exec == 3 && Utils.quantPaginas(this.listaProcessos()) < 8);
      if(this.PaginaVitimaCondicaoMinima()){
        for(let i of this.listaNomes){
          i.exec=1;
        }
        this.nProcessos.set(4);
        this.limparLista(this.listaProcessos());
        this.limparLista(this.respostaMemoriaLogica());
      }
        if(this.aleatorio() || this.PaginaVitimaCondicaoMinima()){
          var sequencia:Array<number> = Utils.embaralhamentoFisherYates(Utils.listaNum(this.nProcessos()));
          var listNunsAleatoriosPages = Utils.listaNumAleatoriosComQuantMinimaFinal(this.nProcessos(), (this.exercicioSelecionado.exec == 3));

          for (var i = 0; i < this.nProcessos(); i++) {
                  this.cadastrar(new Processo(this.listaNomes[sequencia[i]].nome,
                                              listNunsAleatoriosPages[i],
                                              Utils.gera_cor(this.listaProcessos())));
                  this.listaNomes[i].exec = 0;
          }

          this.eRecursoTecnico = this.eRecursoTecnico ==1? 2 : 1;
          this.enviarRecursoTecnico.emit(this.eRecursoTecnico);
          this.enviarDados.emit(this.listaProcessos());
        }
      this.aleatorio.set(false);
  }

  elementoExiste(str:string):number{
    for(var i=0; i<this.listaProcessos().length;i++){
      if(this.listaProcessos()[i].nome == str){
        return i;
      }
    }
    return -1;
  }

  limparLista(listaMemoLogica: Array<Processo>):void{
    for (let i of listaMemoLogica){
      this.excluir(i);
    }
  }

  processosOrdenados(listaDeProcessos: Array<Processo>):Array<Processo>{
    var temp: Array<Processo> = [];

    for (let i of listaDeProcessos){
      if(i.nome == "A")temp[0] = i;
      else if(i.nome == "B")temp[1] = i;
      else if(i.nome == "C")temp[2] = i;
      else if(i.nome == "D")temp[3] = i;
    }
    return temp;
  }

  excluir(proc: Processo):void{
    var v:number = this.elementoExiste(proc.nome);
    if(v!=-1){
      for(var i =0; i<this.listaNomes.length;i++){
        if(this.listaNomes[i].nome==proc.nome)this.listaNomes[i].exec = 1;
      }

      // this.listaNomesTec.push(proc.nome);

      const updatedLista = [...this.listaProcessos()];
      updatedLista.splice(v, 1);
      this.listaProcessos.set(updatedLista);

      const updatedResposta = [...this.respostaMemoriaLogica()];
      updatedResposta.splice(v, 1);
      this.respostaMemoriaLogica.set(updatedResposta);

      this.enviarDados.emit(this.listaProcessos());
      this.enviarRespostaMemoriaLogica.emit(this.respostaMemoriaLogica());

      this.eRecursoTecnico = this.eRecursoTecnico ==1? 2 : 1;
      this.enviarRecursoTecnico.emit(this.eRecursoTecnico);
    }
  }

  cadastrar(proc: Processo):void{
    if(this.validaP(proc) && this.elementoExiste(proc.nome)==-1){

        this.listaProcessos.set([...this.listaProcessos(), new Processo(proc.nome, proc.pagina.length, proc.cor, proc.bit)]);
        this.respostaMemoriaLogica.set([...this.respostaMemoriaLogica(), new Processo(proc.nome, proc.pagina.length, proc.cor, proc.bit)]);

        this.enviarDados.emit(this.listaProcessos());
        this.enviarRespostaMemoriaLogica.emit(this.respostaMemoriaLogica());

        this.eRecursoTecnico = this.eRecursoTecnico ==1? 2 : 1;
        this.enviarRecursoTecnico.emit(this.eRecursoTecnico);
      }
    else this.cancelar();

  }

  validaP(proc: Processo):boolean{
    if (this.nProcessos() < 1 || this.nProcessos() > 4) return false;
    return true;
  }

  cancelar():void{
    this.nProcessos.set(4);
  }

  constructor(){}
}
