import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-menu-lateral-segmentacao',
    templateUrl: './menu-lateral-segmentacao.component.html',
    styleUrls: ['./menu-lateral-segmentacao.component.css'],
    standalone: true,
    imports: [FormsModule]
})
export class MenuLateralSegmentacaoComponent {
  @Output() cadastrarProcesso = new EventEmitter<{ codigo: number, dados: number, pilha: number }>();

  processo: string = '';
  codigo: number | null = null;
  dados: number | null = null;
  pilha: number | null = null;

  aleatorioChecked: boolean = false;

  cadastrar() {
    // Garante que os campos estão preenchidos
    if (this.codigo !== null && this.dados !== null && this.pilha !== null) {
      this.cadastrarProcesso.emit({
        codigo: this.codigo,
        dados: this.dados,
        pilha: this.pilha
      });
    }
  }

  marcarAleatorio(event: Event) {
    const input = event.target as HTMLInputElement;
    this.aleatorioChecked = input.checked;

    if (this.aleatorioChecked) {
      this.processo = this.gerarLetraAleatoria();
      this.codigo = this.gerarNumeroAleatorio(1, 4);
      this.dados = this.gerarNumeroAleatorio(1, 4);
      this.pilha = this.gerarNumeroAleatorio(1, 4);
    } else {
      this.limparCampos();
    }
  }

  cancelar() {
    this.aleatorioChecked = false;
    this.limparCampos();
  }

  private limparCampos() {
    this.processo = '';
    this.codigo = null;
    this.dados = null;
    this.pilha = null;
  }

  private gerarNumeroAleatorio(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private gerarLetraAleatoria(): string {
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alfabeto.charAt(this.gerarNumeroAleatorio(0, alfabeto.length - 1));
  }
}
