import { Component } from '@angular/core';
import { PhysicalMemory } from '../../../models/segmentacao-model/physical-memory';
import { CreateProcessComponent } from '../create-process/create-process.component';

@Component({
    selector: 'app-home',
    standalone: true,
    template: `<app-create-process (enviarDados)="setDados($event)"></app-create-process>`,
    imports: [CreateProcessComponent],
})
export class HomeComponent {
  public physicalMemory: { physicalMemory: Array<PhysicalMemory> } | undefined;

  public setDados(event: { physicalMemory: Array<PhysicalMemory> }) {
    this.physicalMemory = event;
  }
}
