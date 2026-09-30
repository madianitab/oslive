import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';


@Component({
    selector: 'app-area-exercicio-segmentacao',
    templateUrl: './area-exercicio-segmentacao.component.html',
    styleUrls: ['./area-exercicio-segmentacao.component.css'],
    standalone: true,
    imports: []
})
export class AreaExercicioSegmentacaoComponent implements OnChanges {
  @Input() codigo = 0;
  @Input() dados = 0;
  @Input() pilha = 0;

  memoriaLogica: any[] = [];
  tabelaSegmentos: any[] = [];
  tableMemory: [string, string, string][] = [];

  constructor() {
    this.gerarMemoria();
  }

  // Aqui e onde reagem as mudanças dos @Input
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['codigo'] || changes['dados'] || changes['pilha']) {
      this.cadastrar(this.codigo, this.dados, this.pilha);
    }
  }

  cadastrar(codigo: number, dados: number, pilha: number): void {
    this.memoriaLogica = [];
    this.tabelaSegmentos = [];

    const segmentos = [
      { tipo: 'Código', tamanho: codigo, prefixo: 'C', id: '00' },
      { tipo: 'Dados', tamanho: dados, prefixo: 'D', id: '01' },
      { tipo: 'Pilha', tamanho: pilha, prefixo: 'P', id: '10' },
    ];

    let baseAtual = 0;

    segmentos.forEach(seg => {
      const linhas = [];
      for (let i = 0; i < seg.tamanho; i++) {
        const deslocamento = i.toString(2).padStart(5, '0');
        linhas.push({ deslocamento, byte: `${seg.prefixo}${i + 1}` });
      }

      this.memoriaLogica.push({ segmento: seg.id, nome: seg.tipo, linhas });

      const base = baseAtual.toString(2).padStart(5, '0');
      const limite = seg.tamanho.toString(2).padStart(5, '0');
      this.tabelaSegmentos.push({
        segmento: seg.id,
        base,
        limite
      });

      baseAtual += seg.tamanho;
    });
  }

  gerarMemoria() {
    for (let i = 0; i < 32; i++) {
      const enderecoBinario = i.toString(2).padStart(5, '0');
      this.tableMemory.push([enderecoBinario, '', '']);
    }
  }

  whatColor(tipo: string): string {
    switch (tipo) {
      case 'codigo': return '#ADD8E6';
      case 'dados': return '#90EE90';
      case 'pilha': return '#FFB6C1';
      default: return 'transparent';
    }
  }
}