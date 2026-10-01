import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  ExercicioPaginacaoSimplesService,
  TIPOS_EXERCICIO_SIMPLES,
} from 'src/app/features/paginacao/services/exercicio-paginacao-simples.service';

@Component({
  selector: 'app-lateral-exercicio-paginacao-simples',
  templateUrl: './lateral-exercicio-paginacao-simples.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-exercicio-paginacao-simples.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralExercicioPaginacaoSimplesComponent {
  public readonly tipos = TIPOS_EXERCICIO_SIMPLES;

  constructor(public ex: ExercicioPaginacaoSimplesService) {}

  get descricaoTipo(): string {
    return this.tipos.find(t => t.valor === this.ex.tipo())?.descricao ?? '';
  }
}
