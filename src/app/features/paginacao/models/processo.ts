import { Pagina } from "./pagina";

export class Processo{
    public nome: string;
    public pagina: Array<Pagina> = [];
    public cor: string ;
    public bit: boolean;
    
      constructor(_nome: string, _pagina: number, _cor: string , _bit: boolean = false,) {
        this.nome = _nome;
        this.cor = _cor;
        this.bit = _bit;

          for(var i:number = 0; i< _pagina ; i++){
            this.pagina.push(new Pagina( _nome, _cor,i));
          }
        }

        toString() {
          return `\n Nome: ${this.nome} qtPaginas: ${this.pagina.length} Cor: ${this.cor} bit: ${this.bit}`;
        }
}