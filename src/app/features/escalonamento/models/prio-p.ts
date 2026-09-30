import { Processo } from "./processo";
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrioP {
    listaProcessos: Processo[];

    constructor() {
        this.listaProcessos = [];
    }

    vazio(): boolean {
        return this.listaProcessos.length === 0;
    }

    addProcesso(processo: Processo): void {
        this.listaProcessos.push(processo);
        this.listaProcessos.sort((a, b) => {
            if (a.prioridade != null && b.prioridade != null) {
            return a.prioridade - b.prioridade;
            }
            return 0;
        });
    }

    topo(): Processo | undefined {
        return this.listaProcessos[0];
    }

 
    escolherProcesso(): Processo | undefined {
        return this.listaProcessos.shift();
    }


    addTEspera(): void {
        for (let processo of this.listaProcessos) {
            processo.incrTEspera();
        }
    }
}
