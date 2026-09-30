import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Comunicacao {
  private functionTriggers = new Map<string, Subject<void>>();
  private registeredFunctions = new Map<string, () => void>();

  registerFunction(key: string, func: () => void) {
    this.registeredFunctions.set(key, func);
    if (!this.functionTriggers.has(key)) {
      this.functionTriggers.set(key, new Subject<void>());
    }
  }

  triggerFunction(key: string) {
    const trigger = this.functionTriggers.get(key);
    if (trigger) {
      trigger.next();
    }
  }

  executeFunction(key: string) {
    const func = this.registeredFunctions.get(key);
    if (func) {
      func();
    }
  }
}
