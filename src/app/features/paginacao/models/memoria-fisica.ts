
import { MEMORIA_FISICA_COR} from 'src/app/core/constantes';

export class MemoriaFisica{
    public endereco: number;
    public cor: string;
    public nome: string;
    public horaCarga: number;

      constructor(_endereco: number,  _nome:string, _cor:string = MEMORIA_FISICA_COR, _horaCarga:number){
        this.endereco = _endereco;
        this.cor = _cor;
        this.nome = _nome;
        this.horaCarga = _horaCarga;
      }

      toString():string {
        return  "\nEndereco: " + this.endereco+ "_Nome: "+this.nome + " Cor: " + this.cor+ " TimeStamp: " + this.horaCarga;
      }
    }