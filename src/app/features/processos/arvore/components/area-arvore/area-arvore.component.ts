import { Component, ElementRef, ViewChild, computed, effect } from '@angular/core';
import { OsStatComponent } from 'src/app/ui/stat/stat.component';
import { OsAlertComponent } from 'src/app/ui/alert/alert.component';
import { OsTerminalComponent } from 'src/app/ui/terminal/terminal.component';
import { OsSimPlayerComponent } from 'src/app/ui/sim-player/sim-player.component';
import { ArvoreProcessosService } from 'src/app/features/processos/services/arvore-processos.service';
import { EstadoFoto, PID_INIT, TipoEvento } from 'src/app/features/processos/models/arvore-processos';
import { EditorCodigoComponent } from '../editor-codigo/editor-codigo.component';

const W = 90, H = 50, GX = 8, GY = 30, PAD = 6;

interface No { pid: number; ppid: number; x: number; y: number; cor: string; texto: string; }
interface Aresta { pid: number; d: string; }

const ROTULO_TIPO: Record<TipoEvento, string> = {
  inicio: 'início', fork: 'fork', printf: 'printf', wait: 'wait', sleep: 'sleep', acorda: 'acorda', exit: 'fim', escalona: 'CPU',
};

@Component({
  selector: 'app-area-arvore',
  templateUrl: './area-arvore.component.html',
  styleUrls: ['../../../../../ui/styles/sim-viz.css', './area-arvore.component.css'],
  standalone: true,
  imports: [OsStatComponent, OsAlertComponent, OsTerminalComponent, OsSimPlayerComponent, EditorCodigoComponent],
})
export class AreaArvoreComponent {
  readonly W = W;
  readonly H = H;
  readonly rotuloTipo = ROTULO_TIPO;
  @ViewChild('listaEventos') listaEventos?: ElementRef<HTMLElement>;
  @ViewChild('saidaScroll') saidaScroll?: ElementRef<HTMLElement>;

  constructor(public sim: ArvoreProcessosService) {
    // acompanha o evento atual na lista e a última linha da saída
    effect(() => {
      const i = this.sim.indice();
      this.sim.saida();
      setTimeout(() => {
        const lista = this.listaEventos?.nativeElement;
        const item = lista?.querySelector<HTMLElement>(`[data-i="${i}"]`);
        if (lista && item) lista.scrollTop = item.offsetTop - lista.clientHeight / 2;
        const s = this.saidaScroll?.nativeElement;
        if (s) s.scrollTop = s.scrollHeight;
      });
    });
  }

  /** Posições fixas dos nós (calculadas com todos os processos, para não mexer durante a reprodução). */
  readonly arvore = computed(() => {
    const r = this.sim.resultado();
    const cores = this.sim.cores();
    const filhos: Record<number, number[]> = {};
    r.processos.forEach(p => (filhos[p.ppidOrig] ??= []).push(p.pid));
    const ppid: Record<number, number> = {};
    r.processos.forEach(p => ppid[p.pid] = p.ppidOrig);
    const nos: No[] = [];
    const pos: Record<number, { x: number; y: number }> = {};
    let folha = 0;
    let fundo = 0;
    const posicionar = (pid: number, prof: number): void => {
      const fs = filhos[pid] ?? [];
      fs.forEach(f => posicionar(f, prof + 1));
      const x = fs.length ? (pos[fs[0]].x + pos[fs[fs.length - 1]].x) / 2 : PAD + (folha++) * (W + GX);
      const y = PAD + 9 + prof * (H + GY);
      fundo = Math.max(fundo, y + H);
      pos[pid] = { x, y };
      nos.push({ pid, ppid: ppid[pid], x, y, cor: cores[pid], texto: this.sim.textos()[pid] });
    };
    if (r.processos.length) posicionar(r.processos[0].pid, 0);
    const arestas: Aresta[] = r.processos.slice(1).map(p => {
      const a = pos[p.ppidOrig], b = pos[p.pid];
      const x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y;
      return { pid: p.pid, d: `M${x1},${y1} C${x1},${y1 + GY / 2} ${x2},${y2 - GY / 2} ${x2},${y2}` };
    });
    return { nos, arestas, largura: Math.max(folha * (W + GX) - GX + 2 * PAD, W + 2 * PAD), altura: fundo + PAD };
  });

  /** Processo criado pelo evento atual (para destacar a aresta nova). */
  readonly criadoAgora = computed(() => {
    const e = this.sim.evento();
    if (!e || e.tipo !== 'fork') return null;
    const i = this.sim.indice();
    const antes = this.sim.resultado().fotos[i - 1];
    const agora = this.sim.foto();
    if (!antes || !agora) return null;
    const novo = Object.keys(agora.procs).map(Number).find(pid => !antes.procs[pid]);
    return novo ?? null;
  });

  estado(pid: number): EstadoFoto | null {
    return this.sim.estadoDe(pid);
  }

  rotuloEstado(e: EstadoFoto): string {
    switch (e.estado) {
      case 'executando': return 'executando';
      case 'apto': return 'apto';
      case 'bloqueado': return e.detalhe || 'bloqueado';
      case 'zumbi': return 'zumbi';
      case 'terminado': return `fim (${e.status ?? 0})`;
    }
  }

  rotuloPpid(n: No, e: EstadoFoto): string {
    return e.ppid === PID_INIT && n.ppid !== PID_INIT ? `PPID 1←${n.ppid}` : `PPID ${e.ppid}`;
  }
}
