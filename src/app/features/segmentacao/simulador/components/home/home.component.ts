import { Component } from '@angular/core';
import { PhysicalMemory } from '../../../models/segmentacao-model/physical-memory';
import { CreateProcessComponent } from '../create-process/create-process.component';
import { ProcessListComponent } from '../process-list/process-list.component';
import { PhysicalMemoryComponent } from '../physical-memory/physical-memory.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    template: `<app-create-process
      (enviarDados)="setDados($event)"
    ></app-create-process>
    <app-process-list></app-process-list>
    <app-physical-memory></app-physical-memory>
    `,
    standalone: true,
    imports: [CreateProcessComponent, ProcessListComponent, PhysicalMemoryComponent],
})
export class HomeComponent {
  public physicalMemory: { physicalMemory: Array<PhysicalMemory> } | undefined;

  public setDados(event: { physicalMemory: Array<PhysicalMemory> }) {
    this.physicalMemory = event;
  }
}
