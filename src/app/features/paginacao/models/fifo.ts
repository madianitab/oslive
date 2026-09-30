import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';
import { Processo } from './processo';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR} from 'src/app/core/constantes';

export class FIFO {
      public lista: Array<Pagina> = [];

      constructor (){
      }
      memoriaFisicaCheia(memoriaFisica: Array<MemoriaFisica>): number{
            for(var i =0; i< memoriaFisica.length;i++){
                  if(memoriaFisica[i].nome.localeCompare(STR_MEMORIA_VAZIA)==0)return i;
            }
            return -1;
      }
      listaVazia():boolean{
            return this.lista.length ==0;
      }
      addPaginaEmMemoriaFisica(memoriaFisica: Array<MemoriaFisica>, proc: Processo, pag: number, timestamp:number):number{
            var posicaoParaInsercao:number = this.memoriaFisicaCheia(memoriaFisica);
            if(posicaoParaInsercao==-1){
                  posicaoParaInsercao = this.lista[0].indiceMemoriaFisica;
                  this.lista[0].timeStamp = 0;
                  this.lista[0].indiceMemoriaFisica = -1;
                  this.lista.shift();
            }
            
            memoriaFisica[posicaoParaInsercao].nome = proc.pagina[pag].toString();
            memoriaFisica[posicaoParaInsercao].cor = proc.cor;
            memoriaFisica[posicaoParaInsercao].horaCarga = timestamp;

            proc.pagina[pag].indiceMemoriaFisica = posicaoParaInsercao;
            proc.pagina[pag].timeStamp = timestamp;
            
            this.lista.push(proc.pagina[pag]);

            return posicaoParaInsercao;
      }
      removerProcesso(memoriaFisica: Array<MemoriaFisica>,proc: Processo, num:number):number{
            var pos = this.lista.indexOf(proc.pagina[num]);

            for(var i=0; i< memoriaFisica.length;i++){
                if(memoriaFisica[i].nome.localeCompare(proc.pagina[num].toString())==0){
    
                  
                  memoriaFisica[i].nome = STR_MEMORIA_VAZIA;
                  memoriaFisica[i].cor = MEMORIA_FISICA_COR;
                  memoriaFisica[i].horaCarga = 0;
    
                  proc.pagina[num].indiceMemoriaFisica = -1;;
                  proc.pagina[num].timeStamp = 0;
                  
                  this.lista.splice(pos, 1);
                  
                  return i;
                }
            }
        return -1;
      }
}