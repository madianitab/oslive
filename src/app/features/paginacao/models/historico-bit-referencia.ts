import { Pagina } from './pagina';
import { MemoriaFisica } from './memoria-fisica';
import { TAM_HISTORICO_REF, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR} from 'src/app/core/constantes';
import { Utils } from 'src/app/core/utils';

export class HitoricoBitReferencia {
      public lista: Array<Pagina> = [];
      public historicoBit: Array<Array<number>> = [];

      constructor (){
      }
      primeiraPosicaoDisponivel(memoriaFisica: Array<MemoriaFisica>): number{
            for(var i =0; i< memoriaFisica.length;i++){
                  if(memoriaFisica[i].nome.localeCompare(STR_MEMORIA_VAZIA)==0)return i;
            }
            return -1;
      }

      bitAcesso(num: number):Array<number>{
            var x: Array<number> = [];
            for(var i = 0; i< num;i++){
                  x[i] = Math.floor(Math.random() * 2);
            }
            return x;
      }

      verificaBitReferencia(): number{
            var posicaoComzero: Array<number> = Utils.listaNum(this.lista.length);
            
            for(var j = 0;j < TAM_HISTORICO_REF;j++){
                  var apagar: Array<number> = [];
                  
                  for(var i = 0; i< posicaoComzero.length; i++){
                        if(this.historicoBit[posicaoComzero[i]][j] == 1)
                              apagar.push(posicaoComzero[i]);
                  }
                  if(posicaoComzero.length==apagar.length) apagar = [];
                  else {
                        for( let i of apagar){
                              var x = posicaoComzero.indexOf(i);
                              posicaoComzero.splice(x, 1);
                        }
                        if((posicaoComzero.length-apagar.length) == 1)
                              j = TAM_HISTORICO_REF;
                  }
            }
            return posicaoComzero[0];
      }
      
      addPaginaEmMemoriaFisica(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina, 
                              timestamp:number):number{
            var posicaoParaInsercao: number = this.primeiraPosicaoDisponivel(memoriaFisica);
            var posMemoFisica = 0;

            if(posicaoParaInsercao == -1){
                  posicaoParaInsercao = this.verificaBitReferencia();
                  posMemoFisica = this.lista[posicaoParaInsercao].indiceMemoriaFisica;
                  
                  this.lista[posicaoParaInsercao].timeStamp = 0;
                  this.lista[posicaoParaInsercao].indiceMemoriaFisica = -1;

                  this.lista.splice(posicaoParaInsercao, 1);
                  this.historicoBit.splice(posicaoParaInsercao, 1);
            }
            else{
                  posMemoFisica = posicaoParaInsercao;
            }
            
            memoriaFisica[posMemoFisica].nome = paginaX.toString();
            memoriaFisica[posMemoFisica].cor = paginaX.cor;
            memoriaFisica[posMemoFisica].horaCarga = timestamp;

            paginaX.indiceMemoriaFisica = posMemoFisica;
            paginaX.timeStamp = timestamp;

            this.lista.push(paginaX);
            this.historicoBit.push(this.bitAcesso(TAM_HISTORICO_REF));

            return posMemoFisica;
      }

      removerProcesso(memoriaFisica: Array<MemoriaFisica>, paginaX: Pagina,):number{
            var pos = this.lista.indexOf(paginaX);

            for(var i=0; i< memoriaFisica.length;i++){
                if(memoriaFisica[i].nome.localeCompare(paginaX.toString())==0){
    
                  
                  memoriaFisica[i].nome = STR_MEMORIA_VAZIA;
                  memoriaFisica[i].cor = MEMORIA_FISICA_COR;
                  memoriaFisica[i].horaCarga = 0;
    
                  paginaX.indiceMemoriaFisica = -1;;
                  paginaX.timeStamp = 0;
                  
                  this.lista.splice(pos, 1);
                  this.historicoBit.splice(pos, 1);
                  
                  return i;
                }
            }
        return -1;
      }
}