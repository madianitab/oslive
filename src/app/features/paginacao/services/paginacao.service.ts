import { Injectable } from '@angular/core';
import { Pagina } from '../models/pagina';
import { MemoriaFisica } from '../models/memoria-fisica';
import { Processo } from '../models/processo';
import { FCFS } from '../models/fcfs';
import { Utils } from 'src/app/core/utils';
import {
  TAM,
  STR_MEMORIA_VAZIA,
  MEMORIA_FISICA_COR,
  TIMESTAMP_INICIAL,
  QUANT_MAX_PAG_POR_PROC,
} from 'src/app/core/constantes';

export interface EstadoExercicio {
  memoriaFisica: MemoriaFisica[];
  respostaMemoriaFisica: MemoriaFisica[];
  filaDePaginas: Pagina[];
  filaAlgoritmo: FCFS;
  timestamp: number;
}

export interface ResultadoCorrecao {
  acertos: number;
  total: number;
  nivelAcerto: number;
}

@Injectable({ providedIn: 'root' })
export class PaginacaoService {

  inicializarExercicio(processos: Processo[]): EstadoExercicio {
    const filaAlgoritmo = new FCFS();
    const memoriaFisica: MemoriaFisica[] = [];
    const respostaMemoriaFisica: MemoriaFisica[] = [];
    const filaDePaginas: Pagina[] = [];
    let timestamp = TIMESTAMP_INICIAL;

    const quantPagMaiorQueTam = Utils.quantPaginas(processos) > TAM;
    let paginasMenoresQueUm = Utils.quantPaginasMenoresQueX(processos, QUANT_MAX_PAG_POR_PROC / 2);

    for (const item of processos) {
      if (quantPagMaiorQueTam) {
        const limit = Utils.embaralhamentoFisherYates(Utils.listaNum(item.pagina.length));

        item.pagina[0].indiceMemoriaFisica = -1;
        item.pagina[0].timeStamp = 0;
        filaDePaginas.push(item.pagina[limit[0]]);

        if (item.pagina.length > 1) {
          item.pagina[1].indiceMemoriaFisica = -1;
          item.pagina[1].timeStamp = 0;
          filaDePaginas.push(item.pagina[limit[1]]);
        }

        if (paginasMenoresQueUm !== 0 && item.pagina.length > 2) {
          paginasMenoresQueUm -= 1;
          item.pagina[2].indiceMemoriaFisica = -1;
          item.pagina[2].timeStamp = 0;
          filaDePaginas.push(item.pagina[limit[2]]);
        }
      } else {
        for (const pag of item.pagina) {
          pag.indiceMemoriaFisica = -1;
          pag.timeStamp = 0;
          filaDePaginas.push(pag);
        }
      }
    }

    for (let i = 0; i < TAM; i++) {
      memoriaFisica.push(new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0));
      respostaMemoriaFisica.push(new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0));
    }

    const ordemAleatoria = Utils.embaralhamentoFisherYates(Utils.listaNum(filaDePaginas.length));
    for (let i = 0; i < filaDePaginas.length; i++) {
      filaAlgoritmo.addPaginaEmMemoriaFisica(memoriaFisica, filaDePaginas[ordemAleatoria[i]], timestamp);
      timestamp += 1;
    }

    return { memoriaFisica, respostaMemoriaFisica, filaDePaginas, filaAlgoritmo, timestamp };
  }

  atualizarRespostaMemoriaFisica(
    frame: number,
    indicePagina: number,
    estado: EstadoExercicio
  ): void {
    estado.respostaMemoriaFisica[frame].nome = STR_MEMORIA_VAZIA;
    estado.respostaMemoriaFisica[frame].cor = MEMORIA_FISICA_COR;

    if (indicePagina !== -1) {
      estado.respostaMemoriaFisica[frame].nome = estado.filaDePaginas[indicePagina].toString();
      estado.respostaMemoriaFisica[frame].cor = estado.filaDePaginas[indicePagina].cor;
    }
  }

  calcularAcertoMemoriaFisica(
    memoriaFisica: MemoriaFisica[],
    respostaMemoriaFisica: MemoriaFisica[],
    totalPaginas: number
  ): ResultadoCorrecao {
    const total = Math.min(totalPaginas, TAM);
    let acertos = 0;

    for (let i = 0; i < memoriaFisica.length; i++) {
      if (
        memoriaFisica[i].nome === respostaMemoriaFisica[i].nome &&
        memoriaFisica[i].nome !== STR_MEMORIA_VAZIA
      ) {
        acertos++;
      }
    }

    const nivelAcerto = parseFloat(((acertos / total) * 100).toFixed(0));
    return { acertos, total, nivelAcerto };
  }

  calcularAcertoMemoriaLogica(
    respostaProcessos: Processo[],
    gabarito: Processo[]
  ): ResultadoCorrecao {
    let acertos = 0;
    let total = Utils.quantPaginas(gabarito) * 2;

    for (let i = 0; i < respostaProcessos.length; i++) {
      for (let j = 0; j < respostaProcessos[i].pagina.length; j++) {
        if (respostaProcessos[i].pagina[j].indiceMemoriaFisica === gabarito[i].pagina[j].indiceMemoriaFisica) {
          acertos++;
        }
        const respostaNaoCarregada = respostaProcessos[i].pagina[j].timeStamp === 0;
        const gabaritoCarregado = gabarito[i].pagina[j].timeStamp !== 0;
        if (!(respostaNaoCarregada || !(respostaNaoCarregada === !gabaritoCarregado))) {
          acertos++;
        }
      }
    }

    const nivelAcerto = parseFloat(((acertos / total) * 100).toFixed(0));
    return { acertos, total, nivelAcerto };
  }
}
