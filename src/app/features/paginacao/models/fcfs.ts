import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR} from 'src/app/core/constantes';


export class FCFS {
      public lista: Array<Pagina> = [];

      constructor (){
      }
      primeiraPosicaoDisponivel(memoriaFisica: Array<MemoriaFisica>): number{
            for(var i =0; i< memoriaFisica.length;i++){
                  if(memoriaFisica[i].nome.localeCompare(STR_MEMORIA_VAZIA)==0)return i;
            }
            return -1;
      }
      listaVazia():boolean{
            return this.lista.length ==0;
      }

      addPaginaEmMemoriaFisica(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina, timestamp:number):number{
            var posicaoParaInsercao:number = this.primeiraPosicaoDisponivel(memoriaFisica);
            if(posicaoParaInsercao==-1){
                  posicaoParaInsercao = this.lista[0].indiceMemoriaFisica;
                  this.lista[0].timeStamp = 0;
                  this.lista[0].indiceMemoriaFisica = -1;
                  this.lista.shift();
            }
            
            memoriaFisica[posicaoParaInsercao].nome = paginaX.toString();
            memoriaFisica[posicaoParaInsercao].cor = paginaX.cor;
            memoriaFisica[posicaoParaInsercao].horaCarga = timestamp;

            paginaX.indiceMemoriaFisica = posicaoParaInsercao;
            paginaX.timeStamp = timestamp;
            
            this.lista.push(paginaX);

            return posicaoParaInsercao;
      }
      
      removerProcesso(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina) : number{
            var pos = this.lista.indexOf(paginaX);

            for(var i=0; i< memoriaFisica.length;i++){
                if(memoriaFisica[i].nome.localeCompare(paginaX.toString()) == 0){
    
                  memoriaFisica[i].nome = STR_MEMORIA_VAZIA;
                  memoriaFisica[i].cor = MEMORIA_FISICA_COR;
                  memoriaFisica[i].horaCarga = 0;
    
                  paginaX.indiceMemoriaFisica = -1;;
                  paginaX.timeStamp = 0;
                  
                  this.lista.splice(pos, 1);
                  
                  return i;
                }
            }
        return -1;
      }
}