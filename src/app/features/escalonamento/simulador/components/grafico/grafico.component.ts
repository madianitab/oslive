import { Component, Input, OnChanges, SimpleChanges, effect, inject } from '@angular/core';
import { Comunicacao } from 'src/app/features/escalonamento/models/comunicacao';
import { ThemeService } from 'src/app/core/theme.service';

declare var google: any;

@Component({
    selector: 'app-grafico',
    templateUrl: './grafico.component.html',
    styleUrls: ['./grafico.component.css'],
    standalone: true
})

export class GraficoComponent implements OnChanges {
  @Input() processos?: { nome: string; espera: number; execucao: number; turn: number }[] = [];

  private readonly themeSvc = inject(ThemeService);

  constructor(private simulationService: Comunicacao) {
    this.simulationService.registerFunction('apagar', this.deleteChart.bind(this));
    // redesenha quando o tema (claro/escuro) muda
    effect(() => {
      this.themeSvc.theme();
      if (this.processos && this.processos.length) {
        this.loadAndDrawChart();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processos'] && this.processos) {
      this.loadAndDrawChart();
    }
  }

  loadAndDrawChart(): void {
    // O Google Charts vem de CDN (index.html); se não carregar, apenas não desenha o gráfico.
    if (typeof google === 'undefined' || !google.charts) {
      return;
    }
    google.charts.load('current', { 'packages': ['corechart'] });
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

    const dark = this.themeSvc.theme() === 'dark';
    const txt = dark ? '#b0aa98' : '#514c40';
    const grid = dark ? '#2c2920' : '#e2e0da';

    const options = {
      // paleta do design system: espera (âmbar), execução (info), total (ok)
      colors: ['#c2410c', '#1f5d8c', '#3f7d4e'],
      backgroundColor: 'transparent',
      fontName: 'IBM Plex Mono',
      chartArea: { width: '84%', height: '70%' },
      legend: { position: 'bottom', alignment: 'center', textStyle: { color: txt, fontName: 'IBM Plex Mono', fontSize: 11 } },
      hAxis: {
        title: 'Processo',
        textStyle: { color: txt }, titleTextStyle: { color: txt, italic: false },
      },
      vAxis: {
        textStyle: { color: txt },
        gridlines: { color: grid }, minorGridlines: { color: grid }, baselineColor: grid,
      },
      bar: { groupWidth: '68%' },
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
    chart.draw(data, options);
  }

  deleteChart(): void {
    const chartDiv = document.getElementById('chart_div');
    if (chartDiv) {
      chartDiv.innerHTML = '';
    }
  }
}
