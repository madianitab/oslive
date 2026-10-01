import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OsPanelComponent } from 'src/app/ui/panel/panel.component';
import { OsButtonComponent } from 'src/app/ui/button/button.component';
import { SimuladorSegmentacaoService } from 'src/app/features/segmentacao/services/simulador-segmentacao.service';
import { MAX_TAMANHO_SEGMENTO, ProcessoSegmentado, TipoSegmento } from 'src/app/features/segmentacao/models/segmentacao';

@Component({
  selector: 'app-lateral-simulador-segmentacao',
  templateUrl: './lateral-simulador-segmentacao.component.html',
  styleUrls: ['../../../../../ui/styles/sim-config.css', './lateral-simulador-segmentacao.component.css'],
  standalone: true,
  imports: [FormsModule, NgStyle, OsPanelComponent, OsButtonComponent],
})
export class LateralSimuladorSegmentacaoComponent {
  public readonly max = MAX_TAMANHO_SEGMENTO;
  public aleatorio = signal(false);
  public nome = '';
  public codigo: number | null = null;
  public dados: number | null = null;
  public pilha: number | null = null;

  constructor(public sim: SimuladorSegmentacaoService, private notifi: MatSnackBar) {}

  tamanho(p: ProcessoSegmentado, t: TipoSegmento): number {
    return p.segmentos.find(s => s.tipo === t)?.tamanho ?? 0;
  }

  criar(): void {
    this.avisar(this.sim.criarProcesso(this.nome, { C: Number(this.codigo), D: Number(this.dados), P: Number(this.pilha) }), true);
  }

  gerar(): void {
    this.avisar(this.sim.gerarAleatorio(), false);
  }

  limpar(): void {
    this.nome = '';
    this.codigo = this.dados = this.pilha = null;
  }

  private avisar(erro: string | null, limparForm: boolean): void {
    if (erro) {
      this.notifi.open(erro, 'Fechar', { duration: 5000 });
    } else if (limparForm) {
      this.limpar();
    }
  }
}
