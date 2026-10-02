import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

const PALAVRAS = new Set(['int', 'long', 'short', 'unsigned', 'signed', 'char', 'void', 'const', 'static', 'pid_t', 'size_t',
  'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue']);
const CHAMADAS = new Set(['fork', 'wait', 'waitpid', 'sleep', 'exit', '_exit', 'getpid', 'getppid']);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Destaca a sintaxe de uma linha de C. Devolve o HTML e se termina dentro de um comentário. */
export function destacar(linha: string, emComentario: boolean): [string, boolean] {
  let html = '';
  let i = 0;
  const span = (cls: string, txt: string) => `<span class="${cls}">${esc(txt)}</span>`;
  if (!emComentario && linha.trimStart().startsWith('#')) return [span('hl-p', linha), false];
  while (i < linha.length) {
    if (emComentario) {
      const fim = linha.indexOf('*/', i);
      const ate = fim < 0 ? linha.length : fim + 2;
      html += span('hl-c', linha.slice(i, ate));
      i = ate;
      emComentario = fim < 0;
      continue;
    }
    const resto = linha.slice(i);
    let m: RegExpMatchArray | null;
    if (resto.startsWith('//')) { html += span('hl-c', resto); break; }
    if (resto.startsWith('/*')) { emComentario = true; html += span('hl-c', '/*'); i += 2; continue; }
    if ((m = resto.match(/^"(?:[^"\\]|\\.)*"?/)) || (m = resto.match(/^'(?:[^'\\]|\\.)*'?/))) { html += span('hl-s', m[0]); i += m[0].length; continue; }
    if ((m = resto.match(/^\d\w*/))) { html += span('hl-n', m[0]); i += m[0].length; continue; }
    if ((m = resto.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      html += PALAVRAS.has(w) ? span('hl-k', w) : CHAMADAS.has(w) ? span('hl-f', w) : esc(w);
      i += w.length;
      continue;
    }
    html += esc(linha[i]);
    i++;
  }
  return [html, emComentario];
}

/** Editor de código C com números de linha, destaque de sintaxe e linha atual. */
@Component({
  selector: 'app-editor-codigo',
  standalone: true,
  styleUrls: ['./editor-codigo.component.css'],
  template: `
    <div class="editor" [class.erro]="linhaErro !== null">
      <div class="area">
        <div class="gutter" aria-hidden="true">
          @for (l of linhas(); track $index) {
            <div [class.atual]="$index + 1 === linhaAtual" [class.err]="$index + 1 === linhaErro">{{ $index + 1 }}</div>
          }
        </div>
        <div class="camada" aria-hidden="true">
          @for (l of linhas(); track $index) {
            <div class="ln" [class.atual]="$index + 1 === linhaAtual" [class.err]="$index + 1 === linhaErro" [innerHTML]="l"></div>
          }
        </div>
        <textarea rows="1" cols="1" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off"
                  aria-label="Código em C" [value]="texto()" (input)="digitar($event)" (keydown)="tecla($event)"></textarea>
      </div>
    </div>
  `,
})
export class EditorCodigoComponent {
  readonly texto = signal('');
  @Input() set codigo(v: string) { if (v !== this.texto()) this.texto.set(v); }
  @Input() linhaAtual: number | null = null;
  @Input() linhaErro: number | null = null;
  @Output() codigoChange = new EventEmitter<string>();
  @Output() executar = new EventEmitter<void>();

  readonly linhas = computed(() => {
    let com = false;
    return this.texto().split('\n').map(l => {
      const [html, c] = destacar(l, com);
      com = c;
      return html;
    });
  });

  digitar(ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.texto.set(v);
    this.codigoChange.emit(v);
  }

  tecla(ev: KeyboardEvent): void {
    const ta = ev.target as HTMLTextAreaElement;
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      this.executar.emit();
    } else if (ev.key === 'Tab' && !ev.shiftKey) {
      ev.preventDefault();
      ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }
}
