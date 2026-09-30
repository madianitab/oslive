import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import {
  ALGORITMOS_VITIMA,
  ExercicioPaginacaoService,
  TIPOS_EXERCICIO,
} from 'src/app/features/paginacao/services/exercicio-paginacao.service';

@Component({
  selector: 'app-lateral-exercicio-paginacao',
  templateUrl: './lateral-exercicio-paginacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-exercicio-paginacao.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralExercicioPaginacaoComponent {
  public readonly tipos = TIPOS_EXERCICIO;
  public readonly algoritmos = ALGORITMOS_VITIMA;

  constructor(public ex: ExercicioPaginacaoService) {}

  get descricaoTipo(): string {
    return this.tipos.find(t => t.valor === this.ex.tipo())?.descricao ?? '';
  }

  get opcoesQuantidade(): number[] {
    return this.ex.tipo() === 'VITIMA' ? [3, 4] : [1, 2, 3, 4];
  }
}
