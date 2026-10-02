import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { ArvoreProcessosService } from 'src/app/features/processos/services/arvore-processos.service';
import { LIMITE_PROCESSOS, Ordem, PID_INICIAL } from 'src/app/features/processos/models/arvore-processos';

@Component({
  selector: 'app-lateral-arvore',
  templateUrl: './lateral-arvore.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-arvore.component.css'],
  standalone: true,
  imports: [FormsModule, OsPanelComponent],
})
export class LateralArvoreComponent {
  readonly limite = LIMITE_PROCESSOS;
  readonly pidInicial = PID_INICIAL;
  readonly ordens: { v: Ordem; nome: string }[] = [
    { v: 'pai', nome: 'Pai primeiro' },
    { v: 'filho', nome: 'Filho primeiro' },
    { v: 'aleatoria', nome: 'Aleatória' },
  ];
  constructor(public sim: ArvoreProcessosService) {}
}
