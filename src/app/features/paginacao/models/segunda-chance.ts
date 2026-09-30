import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';
import { STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR} from 'src/app/core/constantes';

export class SegundaChance {
      public lista: Array<Pagina> = [];
      public bitReferencia: Array<number> = [];

      constructor (){
      }
      primeiraPosicaoDisponivel(memoriaFisica: Array<MemoriaFisica>): number{
            for(var i =0; i< memoriaFisica.length;i++){
                  if(memoriaFisica[i].nome.localeCompare(STR_MEMORIA_VAZIA)==0)return i;
            }
            return -1;
      }

      segundaChance(_time: number,): number{
            for(var i = 0; i< this.bitReferencia.length; i++){
                  if(this.bitReferencia[i] == 0 ){
                        return i;
                  }
                  else {
                        this.bitReferencia[i] = 0;
                        this.lista[i].timeStamp = _time;
                        _time += 1;

                        var temp = this.lista[i];
                        this.lista.splice(i,1);
                        this.lista.push(temp);

                        var temp2 = this.bitReferencia[i];
                        this.bitReferencia.splice(i,1);
                        this.bitReferencia.push(temp2);
                        i--;
                  }
            }
            return 0;
      }
      
      paginaVitimaEscolhida(): number{
            for(var i = 0; i< this.bitReferencia.length; i++){
                  if(this.bitReferencia[i] == 0 ){
                        return i;
                  }
            }
            return 0;
      }
      addPaginaEmMemoriaFisica(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina, _timestamp:number):number{
            var posicaoParaInsercao:number = this.primeiraPosicaoDisponivel(memoriaFisica);
            var posMemoFisica = 0;

            if(posicaoParaInsercao == -1){
                  posicaoParaInsercao = this.segundaChance(_timestamp);
                  posMemoFisica = this.lista[posicaoParaInsercao].indiceMemoriaFisica;
                  
                  this.lista[posicaoParaInsercao].timeStamp = 0;
                  this.lista[posicaoParaInsercao].indiceMemoriaFisica = -1;

                  this.lista.splice(posicaoParaInsercao, 1);
                  this.bitReferencia.splice(posicaoParaInsercao, 1);
            }
            else{ posMemoFisica = posicaoParaInsercao; }
            
            memoriaFisica[posMemoFisica].nome = paginaX.toString();
            memoriaFisica[posMemoFisica].cor = paginaX.cor;
            memoriaFisica[posMemoFisica].horaCarga = _timestamp;

            paginaX.indiceMemoriaFisica = posMemoFisica;
            paginaX.timeStamp = _timestamp;

            this.lista.push(paginaX);
            this.bitReferencia.push((Math.floor(Math.random() * 15))%2);

            return posMemoFisica;
      }

      removerProcesso(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina):number{
            var pos = this.lista.indexOf(paginaX);

            for(var i=0; i< memoriaFisica.length;i++){
                if(memoriaFisica[i].nome.localeCompare(paginaX.toString())==0){
    
                  
                  memoriaFisica[i].nome = STR_MEMORIA_VAZIA;
                  memoriaFisica[i].cor = MEMORIA_FISICA_COR;
                  memoriaFisica[i].horaCarga = 0;
    
                  paginaX.indiceMemoriaFisica = -1;;
                  paginaX.timeStamp = 0;
                  
                  this.lista.splice(pos, 1);
                  this.bitReferencia.splice(pos, 1);
                  
                  return i;
                }
            }
        return -1;
      }
      
      
}