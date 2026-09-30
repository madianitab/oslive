import { Injectable } from '@angular/core';
import { Processo } from './processo'; 

@Injectable({
  providedIn: 'root'
})

export class SJF {
  private listaProcessos: Processo[];

  constructor() {
    this.listaProcessos = [];
  }

  vazio(): boolean {
    return this.listaProcessos.length === 0;
  }

  addProcesso(processo: Processo): void {
    this.listaProcessos.unshift(processo);
    this.listaProcessos.sort((a, b) => {
      if (a.execucao !== null && b.execucao !== null) {
        return a.execucao - b.execucao;
      }
      return 0;
    });
  }

  escolherProcesso(): Processo | undefined {
    return this.listaProcessos.shift();
  }

  addTEspera(): void {
    this.listaProcessos.forEach(processo => processo.incrTEspera());
  }
}

  