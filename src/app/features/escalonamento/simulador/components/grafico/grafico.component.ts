import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';

declare var google: any;

@Component({
    selector: 'app-grafico',
    templateUrl: './grafico.component.html',
    styleUrls: ['./grafico.component.css'],
    standalone: true
})

export class GraficoComponent implements OnChanges {
  @Input() processos?: { nome: string; espera: number; execucao: number; turn: number }[] = [];

  constructor(private simulationService: Comunicacao) {
    this.simulationService.registerFunction('apagar', this.deleteChart.bind(this));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processos'] && this.processos) {
      this.loadAndDrawChart();
    }
  }

  loadAndDrawChart(): void {
    google.charts.load('current', { 'packages': ['bar'] });
    google.charts.setOnLoadCallback(this.drawChart.bind(this));
  }

  drawChart(): void {
    if (!this.processos || this.processos.length === 0) {
      return;
    }

    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Processo');
    data.addColumn('number', 'T. Espera');
    data.addColumn('number', 'T. Execução');
    data.addColumn('number', 'T. Total');

    for (let processo of this.processos) {
      data.addRows([[processo.nome, processo.espera, processo.execucao, processo.turn]]);
    }

    const options = {
      chart: {
        title: '',
        subtitle: '',
      }
    };

    const chart = new google.charts.Bar(document.getElementById('chart_div'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
  }

  deleteChart(): void {
    const chartDiv = document.getElementById('chart_div');
    if (chartDiv) {
      chartDiv.innerHTML = ''; 
    }
  }
}
