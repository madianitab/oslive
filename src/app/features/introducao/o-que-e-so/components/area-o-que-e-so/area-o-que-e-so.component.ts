import { Component, computed } from '@angular/core';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsTerminalComponent } from 'src/app/ui/terminal/terminal.component';
import { ChamadasSistemaService } from 'src/app/features/introducao/services/chamadas-sistema.service';
import {
  Bloco, CAMADA_DO_BLOCO, REG_VAZIO, ROTULOS_EVENTO, Registradores, TIPOS_CHAMADAS, bitDeModo,
} from 'src/app/features/introducao/models/chamadas-sistema';

interface InfoBloco { id: Bloco; nome: string; sub: string; icone: string; }

@Component({
  selector: 'app-area-o-que-e-so',
  templateUrl: './area-o-que-e-so.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-o-que-e-so.component.css'],
  standalone: true,
  imports: [OsStatComponent, OsTerminalComponent],
})
export class AreaOQueESoComponent {
  readonly rotulosEvento = ROTULOS_EVENTO;
  readonly tipos = TIPOS_CHAMADAS;
  readonly nomesReg: { id: keyof Registradores; papel: string }[] = [
    { id: 'rax', papel: 'nº da chamada / retorno' },
    { id: 'rdi', papel: '1º parâmetro' },
    { id: 'rsi', papel: '2º parâmetro' },
    { id: 'rdx', papel: '3º parâmetro' },
  ];

  readonly programas: InfoBloco[] = [
    { id: 'aplicacao', nome: 'Aplicativos', sub: 'navegador, editor, jogos, ./prog', icone: 'fa-solid fa-window-maximize' },
    { id: 'sistema', nome: 'Programas de sistema', sub: 'shell, compilador, utilitários', icone: 'fa-solid fa-terminal' },
  ];
  readonly nucleo: InfoBloco[] = [
    { id: 'tratador', nome: 'Tabela de chamadas', sub: 'tratador de traps e interrupções', icone: 'fa-solid fa-table-list' },
    { id: 'processos', nome: 'Gerência do processador', sub: 'processos, PCB, escalonador', icone: 'fa-solid fa-gears' },
    { id: 'memoria', nome: 'Gerência de memória', sub: 'espaço de endereçamento', icone: 'fa-solid fa-memory' },
    { id: 'es', nome: 'Gerência de E/S', sub: 'drivers dos dispositivos', icone: 'fa-solid fa-plug' },
    { id: 'arquivos', nome: 'Gerência de arquivos', sub: 'diretórios e descritores', icone: 'fa-solid fa-folder-open' },
  ];
  readonly hardware: InfoBloco[] = [
    { id: 'cpu', nome: 'CPU', sub: '', icone: 'fa-solid fa-microchip' },
    { id: 'ram', nome: 'Memória', sub: 'RAM', icone: 'fa-solid fa-server' },
    { id: 'controladores', nome: 'Controladores', sub: 'vídeo, teclado, disco', icone: 'fa-solid fa-keyboard' },
  ];

  constructor(public sim: ChamadasSistemaService) {}

  readonly modo = computed(() => this.sim.passo()?.modo ?? 'USUARIO');
  readonly bit = computed(() => bitDeModo(this.modo()));
  readonly estado = computed(() => this.sim.passo()?.estado ?? 'Executando');
  readonly regs = computed<Registradores>(() => this.sim.passo()?.regs ?? REG_VAZIO);
  readonly regsAntes = computed<Registradores>(() => this.sim.cenario().passos[this.sim.indice() - 1]?.regs ?? REG_VAZIO);
  readonly linha = computed(() => this.sim.passo()?.linha ?? -1);
  readonly tela = computed(() => this.sim.passo()?.tela ?? '');

  ativo(b: Bloco): boolean {
    return this.sim.passo()?.bloco === b;
  }

  /** Na visão do usuário o SO é um bloco só. */
  soAtivo(): boolean {
    const p = this.sim.passo();
    return !!p && CAMADA_DO_BLOCO[p.bloco] === 'SO';
  }

  fronteira(onde: 'US-SO' | 'SO-HW'): 'desce' | 'sobe' | null {
    const f = this.sim.passo()?.fronteira;
    return f && f.onde === onde ? f.sentido : null;
  }

  rotuloFronteira(onde: 'US-SO' | 'SO-HW'): string {
    const p = this.sim.passo();
    const s = this.fronteira(onde);
    if (!p || !s) return onde === 'US-SO' ? 'chamadas de sistema (trap) ↓   retorno ↑' : 'solicitações aos controladores ↓   interrupções ↑';
    if (p.evento) return this.rotulosEvento[p.evento];
    return onde === 'SO-HW' ? 'Solicitação ao controlador' : '';
  }

  mudou(r: keyof Registradores): boolean {
    return this.sim.indice() >= 0 && this.regs()[r] !== this.regsAntes()[r];
  }

  tipoAtual(tipo: string): boolean {
    return this.sim.cenario().chamada?.tipo === tipo;
  }

  parAtual(unix: string, windows: string): boolean {
    const ch = this.sim.cenario().chamada;
    return !!ch && ch.unix === unix && ch.windows === windows;
  }
}
