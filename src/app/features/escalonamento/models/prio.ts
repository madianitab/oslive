import { Processo } from "./processo";
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})

export class Prio {
    listaProcessos: Processo[];

    constructor() {
        this.listaProcessos = [];
    }

    vazio(): boolean {
        return this.listaProcessos.length === 0;
    }

    addProcesso(processo: Processo): void {
        this.listaProcessos.splice(0, 0, processo);
        this.listaProcessos.sort((a, b) => {
            if (a.prioridade != null && b.prioridade != null) {
                return a.prioridade > b.prioridade ? -1 : 1;
            }
            return 0;
        });
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
