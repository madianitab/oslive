import { Injectable } from '@angular/core';
import { Pagina } from '../models/pagina';
import { MemoriaFisica } from '../models/memoria-fisica';
import { FCFS } from '../models/fcfs';
import { PassoPaginacao } from '../models/passo-paginacao';
import { narrarPasso } from './narrativa-paginacao';
import { TAM, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, TIMESTAMP_INICIAL } from 'src/app/core/constantes';

@Injectable({ providedIn: 'root' })
export class TrilhaPaginacaoService {
  /** clona o array de MemoriaFisica para um snapshot imutável do passo */
  private snapshot(mem: MemoriaFisica[]): MemoriaFisica[] {
    return mem.map(m => new MemoriaFisica(m.endereco, m.nome, m.cor, m.horaCarga));
  }

  construir(filaDePaginas: Pagina[]): PassoPaginacao[] {
    const fcfs = new FCFS();
    const mem: MemoriaFisica[] = [];
    for (let i = 0; i < TAM; i++) {
      mem.push(new MemoriaFisica(i, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, 0));
    }

    const trilha: PassoPaginacao[] = [];
    let ts = TIMESTAMP_INICIAL;

    filaDePaginas.forEach((pagina, indice) => {
      let tipo: PassoPaginacao['tipo'];
      let quadroDestino: number;
      let vitima: Pagina | undefined;
      let quadroVitima: number | undefined;

      if (pagina.indiceMemoriaFisica !== -1) {
        // já está na RAM → hit, sem alterar memória
        tipo = 'hit';
        quadroDestino = pagina.indiceMemoriaFisica;
      } else {
        tipo = 'fault';
        const tinhaLivre = fcfs.primeiraPosicaoDisponivel(mem) !== -1;
        if (!tinhaLivre) {
          // captura a vítima ANTES do add (o model dá shift em lista[0])
          vitima = fcfs.lista[0];
          quadroVitima = vitima.indiceMemoriaFisica;
        }
        quadroDestino = fcfs.addPaginaEmMemoriaFisica(mem, pagina, ts);
        ts += 1;
      }

      const narrativa = narrarPasso({ paginaReferenciada: pagina, tipo, quadroDestino, vitima, quadroVitima });
      trilha.push({
        indice, paginaReferenciada: pagina, tipo, quadroDestino,
        vitima, quadroVitima, memoriaFisica: this.snapshot(mem), narrativa,
      });
    });

    return trilha;
  }
}
