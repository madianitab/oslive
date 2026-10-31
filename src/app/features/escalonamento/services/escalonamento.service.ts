import { Injectable } from '@angular/core';
import { Escalonador } from '../models/escalonador';

export type { ResultadoCpu, ConfigMultilevel } from '../models/escalonador';

/** Os algoritmos ficam em models/escalonador.ts (sem Angular); aqui só o injetável. */
@Injectable({ providedIn: 'root' })
export class EscalonamentoService extends Escalonador {}
