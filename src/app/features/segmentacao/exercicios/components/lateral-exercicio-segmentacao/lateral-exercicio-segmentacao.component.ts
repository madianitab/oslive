import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { ExercicioSegmentacaoService, TIPOS_EXERCICIO_SEG } from 'src/app/features/segmentacao/services/exercicio-segmentacao.service';

@Component({
  selector: 'app-lateral-exercicio-segmentacao',
  templateUrl: './lateral-exercicio-segmentacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-exercicio-segmentacao.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralExercicioSegmentacaoComponent {
  public readonly tipos = TIPOS_EXERCICIO_SEG;
  constructor(public ex: ExercicioSegmentacaoService) {}
  get descricaoTipo(): string {
    return this.tipos.find(t => t.valor === this.ex.tipo())?.descricao ?? '';
  }
}
