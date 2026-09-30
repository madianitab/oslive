import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SegmentacaoService, SegmentacaoState } from '../../services/segmentacao.service';

@Component({
    selector: 'app-create-process',
    templateUrl: './create-process.component.html',
    styleUrls: ['./create-process.component.scss', '/custom.css'],
    standalone: true,
    imports: [FormsModule],
})
export class CreateProcessComponent implements OnInit {

  @Output() public enviarDados = new EventEmitter();

  constructor(private segmentacaoService: SegmentacaoService) {}

  ngOnInit(): void {}

  // Form state
  processName = signal<string>('');
  codeNumber = signal<number>(NaN);
  dataNumber = signal<number>(NaN);
  stackNumber = signal<number>(NaN);
  checkboxChecked = signal<boolean>(false);

  // Memory state
  state = signal<SegmentacaoState>(this.segmentacaoService.criarEstadoInicial());

  // Process list
  processes = signal<Array<{ id: number; name: string; data: any[] }>>([]);
  countProcess = 0;

  // Popup
  popTitle = signal<string>('');
  popMessage = signal<string>('');

  // Derived helpers para o template
  get tableMemory() { return this.state().tableMemory; }
  get tabelaLacunas() { return this.state().tabelaLacunas; }
  get colors() { return this.state().colors; }

  public async submitProcess() {
    const name = this.processName().toUpperCase();
    this.processName.set(name);

    const exists = this.processes().some(p => p.name === name);
    const valid = this.segmentacaoService.validInput(name, this.codeNumber(), this.dataNumber(), this.stackNumber());

    if (!exists && valid) {
      const { success, state } = this.segmentacaoService.alocarProcesso(
        this.state(), name, this.codeNumber(), this.dataNumber(), this.stackNumber()
      );
      if (success) {
        this.state.set(state);
        const { tables, colors } = this.segmentacaoService.buildTables(
          name, this.codeNumber(), this.dataNumber(), this.stackNumber(),
          state.tableMemory, state.colors
        );
        this.state.update(s => ({ ...s, colors }));
        this.processes.update(list => [...list, { id: this.countProcess, name, data: tables }]);
        this.countProcess++;
        await this.sleep(1);
        this.showProcess(name);
        this.resetFields();
      } else {
        this.showPopup(1);
      }
    } else {
      this.showPopup(exists ? 2 : 3);
    }
  }

  public removeProcess(index: number) {
    const name = this.processes()[index].name;
    this.state.update(s => this.segmentacaoService.remover(s, name));
    this.processes.update(list => list.filter((_, i) => i !== index));
  }

  public randonNumbers() {
    if (this.checkboxChecked()) {
      const existingNames = this.processes().map(p => p.name);
      this.processName.set(this.segmentacaoService.randonChar(existingNames));
      this.codeNumber.set(Math.floor(Math.random() * 4) + 1);
      this.dataNumber.set(Math.floor(Math.random() * 4) + 1);
      this.stackNumber.set(Math.floor(Math.random() * 4) + 1);
      this.tornarInputSomenteLeitura();
    } else {
      this.resetFields();
    }
  }

  public whatColor(code: string): string | undefined {
    return this.segmentacaoService.whatColor(this.state().colors, code);
  }

  public decimalToBinary(n: number): string {
    return this.segmentacaoService.decimalToBinary(n);
  }

  // ─── UI-only methods ─────────────────────────────────────────────────────

  public resetFields() {
    this.checkboxChecked.set(false);
    this.processName.set('');
    this.codeNumber.set(NaN);
    this.dataNumber.set(NaN);
    this.stackNumber.set(NaN);
    this.liberarEdicao();
  }

  public closePopup() {
    const el = document.getElementById('popup');
    if (el) el.style.display = 'none';
  }

  public showProcess(processName: string) {
    this.processes().forEach(p => {
      const el = document.getElementById('contain-' + p.name);
      if (el) el.style.display = 'none';
    });
    const el = document.getElementById('contain-' + processName);
    if (el) el.style.display = 'flex';

    this.processes().forEach(p => {
      const btn = document.getElementById('btn-lat-' + p.name);
      btn?.classList.remove('open-process');
      const btn2 = document.getElementById('btn-top-' + p.name);
      btn2?.classList.remove('open-process');
    });
    document.getElementById('btn-lat-' + processName)?.classList.add('open-process');
    document.getElementById('btn-top-' + processName)?.classList.add('open-process');
  }

  public showPopup(cod: number) {
    const messages: Record<number, [string, string]> = {
      1: ['Memória cheia!!', 'Não existe espaço suficente para a criação do processo.'],
      2: ['Já existe um processo com esse nome!!', `O processo ${this.processName()} já foi criado.`],
      3: ['Preencha todos os campos!!', 'Os campos Processo, Código, Dados e Pilha, são obrigatórios.'],
      4: ['Gerenciamento de Memória com Segmentação', 'O gerenciamento de memória por segmentação é uma técnica usada por sistemas operacionais para organizar e alocar memória com mais eficiência. Esse método divide o espaço de endereço em segmentos lógicos, cada um correspondendo a uma parte lógica ou funcional do programa ou processo. Cada segmento tem um tamanho e um endereço base. Quando um programa é executado, seus segmentos são alocados em regiões de memória física conforme necessário. Isso permite um mapeamento mais flexível e modular, pois cada segmento pode ser tratado de forma independente, facilitando o compartilhamento de dados e protegendo a memória entre os processos.'],
      5: ['Memória Lógica', 'A memória lógica refere-se a uma visão abstrata e virtual da memória que cada processo possui. Cada processo possui sua própria memória lógica dividida em segmentos ou partes lógicas como código, dados e pilha. Esses segmentos são identificados por endereços lógicos ou virtuais usados ​​por processos para acessar e manipular dados armazenados na memória. Com a memória lógica, um processo pode ter a ilusão de ter uma memória consistente e exclusiva, independentemente de como sua memória física está organizada. Durante a execução do programa, o sistema operacional é responsável por traduzir endereços lógicos em endereços físicos correspondentes, usando técnicas como tabelas de páginas e tabelas de segmentos, para que os processos possam alocar e acessar os recursos de memória corretamente.'],
      6: ['Tabela de Segmentos', 'Uma tabela de segmentos é uma estrutura de dados usada no gerenciamento de memória segmentada. Sua finalidade é rastrear os segmentos do processo que existem na memória e registrar informações como endereço base, tamanho e status de cada segmento. Por meio dessa tabela, o sistema operacional pode realizar consultas, operações de alocação e desalocação de segmentos, além de garantir a integridade e o uso correto da memória.'],
      7: ['Memória Física', 'A memória física é a parte real da memória do sistema na qual os segmentos do processo são armazenados. Isso dá ao processador acesso direto e rápido a dados e instruções. A alocação eficiente de segmentos na memória física requer garantir que não haja sobreposição entre os segmentos e otimizar a configuração para minimizar a fragmentação.'],
    };
    const [title, msg] = messages[cod] ?? ['', ''];
    this.popTitle.set(title);
    this.popMessage.set(msg);
    const el = document.getElementById('popup');
    if (el) el.style.display = 'block';
  }

  private tornarInputSomenteLeitura(): void {
    ['processo', 'codigo', 'dado', 'pilha'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.readOnly = true;
    });
  }

  private liberarEdicao(): void {
    ['processo', 'codigo', 'dado', 'pilha'].forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.readOnly = false;
    });
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
