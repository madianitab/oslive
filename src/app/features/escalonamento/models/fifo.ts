import { Injectable } from '@angular/core';
import { Processo } from './processo'; 

@Injectable({
  providedIn: 'root'
})
export class FIFO {
  private listaProcessos: Processo[] = [];

  constructor() {}

  vazio(): boolean {
    return this.listaProcessos.length === 0;
  }

  addProcesso(processo: Processo | undefined): void {
    if(processo){
      this.listaProcessos.push(processo);
    }
  }

  escolherProcesso(): Processo | undefined {
    return this.listaProcessos.shift();
  }

  addTEspera(tempo: number): void {
    this.listaProcessos.forEach((processo) => {
      for (let j = 0; j < tempo; j++) {
        processo.incrTEspera();
      }
    });
  }
}
