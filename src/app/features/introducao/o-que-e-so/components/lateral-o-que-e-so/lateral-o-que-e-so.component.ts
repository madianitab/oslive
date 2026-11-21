import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { ChamadasSistemaService, VELOCIDADES } from 'src/app/features/introducao/services/chamadas-sistema.service';

@Component({
  selector: 'app-lateral-o-que-e-so',
  templateUrl: './lateral-o-que-e-so.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-o-que-e-so.component.css'],
  standalone: true,
  imports: [FormsModule, OsPanelComponent],
})
export class LateralOQueESoComponent {
  readonly velocidades = VELOCIDADES;
  constructor(public sim: ChamadasSistemaService) {}
}
