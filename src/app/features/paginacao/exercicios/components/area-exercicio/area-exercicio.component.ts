import { Component, EventEmitter, Input, OnChanges, OnInit, Output, signal, computed } from '@angular/core';
import { Pagina } from 'src/app/features/paginacao/models/pagina';
import { MemoriaFisica } from 'src/app/features/paginacao/models/memoria-fisica';
import { Processo } from 'src/app/features/paginacao/models/processo';
import { FCFS } from 'src/app/features/paginacao/models/fcfs';
import { TAM, STR_MEMORIA_VAZIA, MEMORIA_FISICA_COR, STR_BIT_ESTADO } from 'src/app/core/constantes';
import { PaginacaoService } from 'src/app/features/paginacao/services/paginacao.service';
import { Utils } from 'src/app/core/utils';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-area-exercicio',
    templateUrl: './area-exercicio.component.html',
    styleUrls: ['./area-exercicio.component.css'],
    standalone: true,
    imports: [FormsModule, NgClass]
})
export class AreaExercicioComponent implements OnInit, OnChanges {
  public title: string = 'Exercícios de Paginação por Demanda com Substituição de Páginas';

  @Input() public listaProcessos: Array<Processo> = [];
  @Input() public respostaMemoriaLogica: Array<Processo> = [];
  @Input() public exercicioSelecionado: Number = new Number;
  @Input() public gambiarra: Number = new Number;

  @Output() public enviarDadosMemoria = new EventEmitter();
  @Output() public enviarBack: EventEmitter<any> = new EventEmitter();

  readonly TAM: number = TAM;
  readonly strMemoFisicaCor: string = MEMORIA_FISICA_COR;
  readonly strMemoVazia: string = STR_MEMORIA_VAZIA;
  readonly arrBitEstado: Array<string> = STR_BIT_ESTADO;

  // Signals — estado reativo
  readonly memoriaF = signal<MemoriaFisica[]>([]);
  readonly respostaMemoriaFisica = signal<MemoriaFisica[]>([]);
  readonly filaDePaginas = signal<Pagina[]>([]);
  readonly nivelAcerto = signal<number>(0);
  readonly corrigir = signal<boolean>(false);
  readonly visualizarResposta = signal<boolean>(false);
  readonly opcaoSelecionada = signal<any[]>([]);
  readonly opcaoSelecionadaCorrecao = signal<boolean[]>([]);

  readonly podeCorrigir = computed(() => !this.visualizarResposta());

  public filaAlgoritmoSelecionado: FCFS = new FCFS();
  private timestamp: number = 0;
  back: Number = 0;

  constructor(private paginacaoService: PaginacaoService) {}

  ngOnInit(): void {
    this.preencherMemoriaFisica();
  }

  ngOnChanges(): void {
    this.preencherMemoriaFisica();
  }

  preencherMemoriaFisica(): void {
    this.opcaoSelecionada.set([]);
    this.opcaoSelecionadaCorrecao.set([]);
    this.corrigir.set(false);
    this.visualizarResposta.set(false);

    const estado = this.paginacaoService.inicializarExercicio(this.listaProcessos);
    this.memoriaF.set(estado.memoriaFisica);
    this.respostaMemoriaFisica.set(estado.respostaMemoriaFisica);
    this.filaDePaginas.set(estado.filaDePaginas);
    this.filaAlgoritmoSelecionado = estado.filaAlgoritmo;
    this.timestamp = estado.timestamp;

    this.enviarDadosMemoria.emit(this.filaAlgoritmoSelecionado);
    this.calcularNivelAcerto();
  }

  alocaPaginaEmMemoriaFisica(pagX: Pagina): boolean {
    this.filaAlgoritmoSelecionado.addPaginaEmMemoriaFisica(this.memoriaF(), pagX, this.timestamp);
    this.timestamp += 1;
    this.enviarDadosMemoria.emit(this.filaAlgoritmoSelecionado);
    return true;
  }

  desalocaPaginaEmMemoriaFisica(pagX: Pagina): boolean {
    const i = this.filaAlgoritmoSelecionado.removerProcesso(this.memoriaF(), pagX);
    this.enviarDadosMemoria.emit(this.filaAlgoritmoSelecionado);
    return i !== -1;
  }

  onSelecionarPagina(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const arr = value.split(',');
    this.preencherGabaritoMemoriaFisica(Number(arr[0]), Number(arr[1]));
  }

  preencherGabaritoMemoriaFisica(frame: number, indicePagina: number): void {
    this.paginacaoService.atualizarRespostaMemoriaFisica(frame, indicePagina, {
      memoriaFisica: this.memoriaF(),
      respostaMemoriaFisica: this.respostaMemoriaFisica(),
      filaDePaginas: this.filaDePaginas(),
      filaAlgoritmo: this.filaAlgoritmoSelecionado,
      timestamp: this.timestamp,
    });

    const opcoes = [...this.opcaoSelecionada()];
    opcoes[frame] = [frame, indicePagina];
    this.opcaoSelecionada.set(opcoes);

    const correcoes = [...this.opcaoSelecionadaCorrecao()];
    correcoes[frame] = this.respostaMemoriaFisica()[frame].nome === this.memoriaF()[frame].nome;
    this.opcaoSelecionadaCorrecao.set(correcoes);

    this.calcularNivelAcerto();
  }

  calcularNivelAcerto(): void {
    const totalPaginas = Utils.quantPaginas(this.listaProcessos);

    if (this.exercicioSelecionado == 1) {
      const resultado = this.paginacaoService.calcularAcertoMemoriaLogica(
        this.respostaMemoriaLogica,
        this.listaProcessos
      );
      this.nivelAcerto.set(resultado.nivelAcerto);
    } else {
      const resultado = this.paginacaoService.calcularAcertoMemoriaFisica(
        this.memoriaF(),
        this.respostaMemoriaFisica(),
        totalPaginas
      );
      this.nivelAcerto.set(resultado.nivelAcerto);
    }
  }

  correcao(): void {
    if (this.podeCorrigir()) this.corrigir.update(v => !v);
  }

  visualizarRespostaExercicio(): void {
    this.visualizarResposta.update(v => !v);
    this.corrigir.set(false);
  }

  reiniciar(): void {
    this.back = this.back == 1 ? 2 : 1;
    this.enviarBack.emit(this.back);
  }

  counter(i: number) {
    return new Array(i);
  }
}
