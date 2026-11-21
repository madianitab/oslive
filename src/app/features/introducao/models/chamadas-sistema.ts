/**
 * O que é um SO: camadas do sistema e chamadas de sistema.
 *
 * Referências: Oliveira, Carissimi e Toscani (SO como intermediário entre o hardware e os programas;
 * visão do usuário × visão do projeto; chamada de sistema por interrupção de software);
 * Silberschatz (modo dual com bit de modo: kernel = 0, usuário = 1; API × chamada de sistema;
 * passagem de parâmetros em registradores; tipos de chamadas e a tabela UNIX × Windows);
 * Tanenbaum (os passos de uma chamada read; instrução de trap; programas de usuário fora do núcleo).
 *
 * Cada cenário é uma lista de passos. Um passo diz onde a execução está (bloco do diagrama de camadas),
 * em que modo a CPU está e o que mudou (registradores, tela, estado do processo). Os números das
 * chamadas são os do Linux x86-64 (rax = número e retorno; rdi, rsi, rdx = parâmetros).
 */

export type Modo = 'USUARIO' | 'KERNEL';

/** Blocos do diagrama de camadas, de cima para baixo. */
export type Bloco =
  | 'usuario'
  | 'aplicacao' | 'sistema'
  | 'biblioteca'
  | 'tratador' | 'processos' | 'memoria' | 'es' | 'arquivos'
  | 'cpu' | 'ram' | 'controladores';

export type Camada = 'USUARIO' | 'PROGRAMAS' | 'BIBLIOTECA' | 'SO' | 'HARDWARE';

export const CAMADA_DO_BLOCO: Record<Bloco, Camada> = {
  usuario: 'USUARIO',
  aplicacao: 'PROGRAMAS', sistema: 'PROGRAMAS',
  biblioteca: 'BIBLIOTECA',
  tratador: 'SO', processos: 'SO', memoria: 'SO', es: 'SO', arquivos: 'SO',
  cpu: 'HARDWARE', ram: 'HARDWARE', controladores: 'HARDWARE',
};

/** Mudanças de modo e interrupções. */
export type Evento = 'TRAP' | 'EXCECAO' | 'INT_HW' | 'RETORNO';

export const ROTULOS_EVENTO: Record<Evento, string> = {
  TRAP: 'Interrupção de software (trap)',
  EXCECAO: 'Exceção (trap de proteção)',
  INT_HW: 'Interrupção de hardware',
  RETORNO: 'Retorno ao modo usuário',
};

/** Seta entre camadas: usuário/kernel (US-SO) ou SO/controladores (SO-HW). */
export interface Fronteira { onde: 'US-SO' | 'SO-HW'; sentido: 'desce' | 'sobe'; }

export type EstadoProcesso = 'Executando' | 'Bloqueado' | 'Apto' | 'Destruição';

export interface Registradores { rax: string; rdi: string; rsi: string; rdx: string; }

export const REG_VAZIO: Registradores = { rax: '—', rdi: '—', rsi: '—', rdx: '—' };

export interface Passo {
  titulo: string;
  texto: string;
  bloco: Bloco;
  modo: Modo;
  evento: Evento | null;
  fronteira: Fronteira | null;
  /** Linha do código em destaque (índice a partir de 0). */
  linha: number;
  regs: Registradores;
  tela: string;
  estado: EstadoProcesso;
}

/** Passo como escrito no cenário: o que não for informado continua igual ao passo anterior. */
export interface PassoParcial {
  titulo: string;
  texto: string;
  bloco: Bloco;
  modo: Modo;
  evento?: Evento;
  fronteira?: Fronteira;
  linha?: number;
  regs?: Partial<Registradores>;
  tela?: string;
  estado?: EstadoProcesso;
}

export type TipoChamada =
  | 'Controle de processos'
  | 'Gerenciamento de arquivos'
  | 'Gerenciamento de dispositivos'
  | 'Manutenção de informações'
  | 'Comunicações'
  | 'Proteção'
  | 'Instrução privilegiada';

export interface Cenario {
  id: string;
  nome: string;
  codigo: string[];
  /** Chamada de sistema envolvida (null quando não há chamada). */
  chamada: { unix: string; numero: number | null; windows: string; tipo: TipoChamada } | null;
  passos: Passo[];
}

/** Completa os passos repetindo o que não mudou (linha, registradores, tela e estado). */
export function montarPassos(parciais: PassoParcial[], linhaInicial: number): Passo[] {
  let linha = linhaInicial;
  let regs: Registradores = { ...REG_VAZIO };
  let tela = '';
  let estado: EstadoProcesso = 'Executando';
  return parciais.map(p => {
    if (p.linha !== undefined) linha = p.linha;
    if (p.regs) regs = { ...regs, ...p.regs };
    if (p.tela !== undefined) tela = p.tela;
    if (p.estado) estado = p.estado;
    return {
      titulo: p.titulo, texto: p.texto, bloco: p.bloco, modo: p.modo,
      evento: p.evento ?? null, fronteira: p.fronteira ?? null,
      linha, regs: { ...regs }, tela, estado,
    };
  });
}

const DESCE_US_SO: Fronteira = { onde: 'US-SO', sentido: 'desce' };
const SOBE_US_SO: Fronteira = { onde: 'US-SO', sentido: 'sobe' };
const DESCE_SO_HW: Fronteira = { onde: 'SO-HW', sentido: 'desce' };
const SOBE_SO_HW: Fronteira = { onde: 'SO-HW', sentido: 'sobe' };

/** Passos comuns a toda chamada de sistema: trap e identificação na tabela de chamadas. */
function entrada(rotina: string, numero: number): PassoParcial[] {
  return [
    {
      titulo: 'Trap: modo usuário → modo kernel',
      texto: 'A instrução syscall gera uma interrupção de software (trap). A CPU muda o bit de modo de 1 para 0 (modo kernel) e desvia para o tratador do SO.',
      bloco: 'cpu', modo: 'KERNEL', evento: 'TRAP', fronteira: DESCE_US_SO,
    },
    {
      titulo: `SO identifica a chamada (${rotina})`,
      texto: `O SO salva o contexto do processo e usa o número em rax (${numero}) para achar, na tabela de chamadas de sistema, a rotina ${rotina}.`,
      bloco: 'tratador', modo: 'KERNEL',
    },
  ];
}

/** Retorno comum: resultado em rax e volta ao modo usuário. */
function retorno(texto: string, rax: string): PassoParcial {
  return {
    titulo: 'Retorno: modo kernel → modo usuário',
    texto: `${texto} O SO restaura o contexto e executa a instrução de retorno: o bit de modo volta a 1 (modo usuário).`,
    bloco: 'cpu', modo: 'USUARIO', evento: 'RETORNO', fronteira: SOBE_US_SO, regs: { rax },
  };
}

function cenarioWrite(): Cenario {
  const codigo = [
    '#include <stdio.h>',
    'int main() {',
    '    printf("Oi\\n");',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa chama printf()',
      texto: 'printf é uma função da biblioteca C, não uma chamada de sistema. Por enquanto é uma chamada de função comum, no modo usuário.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'Biblioteca prepara write()',
      texto: 'printf monta o texto e chama write(1, "Oi\\n", 3). A biblioteca coloca o número da chamada em rax (write = 1) e os parâmetros em rdi, rsi e rdx.',
      bloco: 'biblioteca', modo: 'USUARIO',
      regs: { rax: '1 (write)', rdi: '1 (tela)', rsi: 'end. de "Oi\\n"', rdx: '3 (bytes)' },
    },
    ...entrada('sys_write', 1),
    {
      titulo: 'Chamada é legítima?',
      texto: 'Antes de atender, o SO confere os parâmetros: o descritor 1 está aberto? O endereço do texto pertence ao processo? Tudo certo.',
      bloco: 'tratador', modo: 'KERNEL',
    },
    {
      titulo: 'Driver envia ao controlador',
      texto: 'A gerência de E/S (driver do terminal) envia a solicitação ao controlador de vídeo. Só o SO, no modo kernel, acessa o controlador.',
      bloco: 'es', modo: 'KERNEL', fronteira: DESCE_SO_HW,
    },
    {
      titulo: 'Hardware executa',
      texto: 'O controlador mostra "Oi" na tela.',
      bloco: 'controladores', modo: 'KERNEL', tela: 'Oi',
    },
    retorno('O SO coloca o resultado em rax: 3 bytes escritos.', '3'),
    {
      titulo: 'write() retorna 3',
      texto: 'write devolve 3 para printf, que retorna ao programa.',
      bloco: 'biblioteca', modo: 'USUARIO',
    },
    {
      titulo: 'Programa continua',
      texto: 'O programa segue para a próxima linha, sem saber dos detalhes que aconteceram no SO e no hardware.',
      bloco: 'aplicacao', modo: 'USUARIO', linha: 3,
    },
  ], 2);
  return {
    id: 'write', nome: 'Escrever na tela — printf()', codigo,
    chamada: { unix: 'write', numero: 1, windows: 'WriteFile', tipo: 'Gerenciamento de arquivos' },
    passos,
  };
}

function cenarioRead(): Cenario {
  const codigo = [
    '#include <unistd.h>',
    'int main() {',
    '    char buf[10];',
    '    int n = read(0, buf, 10);',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa chama read()',
      texto: 'read(0, buf, 10): ler até 10 bytes do teclado (descritor 0). read é a função da biblioteca C que faz a chamada de sistema de mesmo nome.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'Biblioteca prepara a chamada',
      texto: 'A biblioteca coloca o número da chamada em rax (read = 0) e os parâmetros em rdi, rsi e rdx.',
      bloco: 'biblioteca', modo: 'USUARIO',
      regs: { rax: '0 (read)', rdi: '0 (teclado)', rsi: 'end. de buf', rdx: '10 (bytes)' },
    },
    ...entrada('sys_read', 0),
    {
      titulo: 'Chamada é legítima?',
      texto: 'O SO confere os parâmetros: o descritor 0 está aberto? buf pertence ao processo? Tudo certo.',
      bloco: 'tratador', modo: 'KERNEL',
    },
    {
      titulo: 'Sem dados: processo bloqueia',
      texto: 'Ninguém digitou nada ainda. O driver do teclado registra o pedido e o processo vai para o estado Bloqueado, na fila do teclado.',
      bloco: 'es', modo: 'KERNEL', estado: 'Bloqueado',
    },
    {
      titulo: 'CPU vai para outro processo',
      texto: 'A gerência do processador escolhe outro processo da fila de aptos e faz a troca de contexto. A CPU não fica parada esperando o teclado.',
      bloco: 'processos', modo: 'KERNEL',
    },
    {
      titulo: 'Usuário digita 42 ⏎',
      texto: 'O controlador do teclado gera uma interrupção de hardware. A CPU interrompe o processo que estava executando, passa para o modo kernel e desvia para o SO.',
      bloco: 'controladores', modo: 'KERNEL', evento: 'INT_HW', fronteira: SOBE_SO_HW, tela: '42',
    },
    {
      titulo: 'SO entrega os dados',
      texto: 'O driver copia "42\\n" para buf e coloca em rax o resultado (3 bytes). O processo sai de Bloqueado e vai para Apto.',
      bloco: 'es', modo: 'KERNEL', estado: 'Apto', regs: { rax: '3' },
    },
    {
      titulo: 'Processo volta à CPU',
      texto: 'Quando o escalonador seleciona o processo, o SO restaura o contexto dele.',
      bloco: 'processos', modo: 'KERNEL', estado: 'Executando',
    },
    retorno('O resultado já está em rax: 3 bytes lidos.', '3'),
    {
      titulo: 'read() retorna 3',
      texto: 'A biblioteca devolve 3 ao programa.',
      bloco: 'biblioteca', modo: 'USUARIO',
    },
    {
      titulo: 'Programa continua',
      texto: 'n = 3 e buf tem "42\\n". O programa segue para a próxima linha.',
      bloco: 'aplicacao', modo: 'USUARIO', linha: 4,
    },
  ], 3);
  return {
    id: 'read', nome: 'Ler do teclado — read()', codigo,
    chamada: { unix: 'read', numero: 0, windows: 'ReadFile', tipo: 'Gerenciamento de arquivos' },
    passos,
  };
}

function cenarioGetpid(): Cenario {
  const codigo = [
    '#include <unistd.h>',
    'int main() {',
    '    pid_t p = getpid();',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa chama getpid()',
      texto: 'O programa quer saber o próprio PID. Só o SO tem essa informação.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'Biblioteca prepara a chamada',
      texto: 'A biblioteca coloca o número da chamada em rax (getpid = 39). Essa chamada não tem parâmetros.',
      bloco: 'biblioteca', modo: 'USUARIO', regs: { rax: '39 (getpid)' },
    },
    ...entrada('sys_getpid', 39),
    {
      titulo: 'Consulta o PCB',
      texto: 'A gerência do processador lê o PID no bloco descritor do processo (PCB): 1877. Nenhum dispositivo é usado.',
      bloco: 'processos', modo: 'KERNEL', regs: { rax: '1877' },
    },
    retorno('O PID já está em rax.', '1877'),
    {
      titulo: 'getpid() retorna 1877',
      texto: 'A biblioteca devolve 1877 ao programa.',
      bloco: 'biblioteca', modo: 'USUARIO',
    },
    {
      titulo: 'Programa continua',
      texto: 'p = 1877. Nem toda chamada de sistema usa o hardware: esta só consultou dados do SO.',
      bloco: 'aplicacao', modo: 'USUARIO', linha: 3,
    },
  ], 2);
  return {
    id: 'getpid', nome: 'Saber o próprio PID — getpid()', codigo,
    chamada: { unix: 'getpid', numero: 39, windows: 'GetCurrentProcessId', tipo: 'Manutenção de informações' },
    passos,
  };
}

function cenarioFork(): Cenario {
  const codigo = [
    '#include <unistd.h>',
    'int main() {',
    '    pid_t p = fork();',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa chama fork()',
      texto: 'O processo 1877 pede ao SO a criação de um processo filho.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'Biblioteca prepara a chamada',
      texto: 'A biblioteca coloca o número da chamada em rax (fork = 57).',
      bloco: 'biblioteca', modo: 'USUARIO', regs: { rax: '57 (fork)' },
    },
    ...entrada('sys_fork', 57),
    {
      titulo: 'Cria o PCB do filho',
      texto: 'A gerência do processador cria um PCB novo, com PID 1878 e pai 1877, e coloca o filho na fila de aptos.',
      bloco: 'processos', modo: 'KERNEL',
    },
    {
      titulo: 'Copia a memória do pai',
      texto: 'A gerência de memória dá ao filho uma cópia do espaço de endereçamento do pai. No Linux é copy-on-write: uma página só é copiada quando um dos dois escreve nela.',
      bloco: 'memoria', modo: 'KERNEL',
    },
    retorno('No pai, rax recebe 1878 (PID do filho). No filho, quando ele for executado, rax terá 0.', '1878'),
    {
      titulo: 'fork() retorna duas vezes',
      texto: 'fork devolve 1878 no pai e 0 no filho (ou −1 se não fosse possível criar o processo).',
      bloco: 'biblioteca', modo: 'USUARIO',
    },
    {
      titulo: 'Pai e filho continuam',
      texto: 'Os dois seguem a partir do retorno do fork(), cada um com sua cópia das variáveis: p = 1878 no pai e p = 0 no filho.',
      bloco: 'aplicacao', modo: 'USUARIO', linha: 3,
    },
  ], 2);
  return {
    id: 'fork', nome: 'Criar um processo — fork()', codigo,
    chamada: { unix: 'fork', numero: 57, windows: 'CreateProcess', tipo: 'Controle de processos' },
    passos,
  };
}

function cenarioOpenErro(): Cenario {
  const codigo = [
    '#include <fcntl.h>',
    'int main() {',
    '    int fd = open("notas.txt", O_RDONLY);',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa chama open()',
      texto: 'O programa pede para abrir notas.txt só para leitura. Esse arquivo não existe.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'Biblioteca prepara a chamada',
      texto: 'A biblioteca coloca o número da chamada em rax (open = 2) e os parâmetros em rdi e rsi.',
      bloco: 'biblioteca', modo: 'USUARIO',
      regs: { rax: '2 (open)', rdi: 'end. de "notas.txt"', rsi: '0 (O_RDONLY)' },
    },
    ...entrada('sys_open', 2),
    {
      titulo: 'Arquivo não encontrado',
      texto: 'A gerência de arquivos procura notas.txt no diretório e não o encontra. A chamada não pode ser atendida.',
      bloco: 'arquivos', modo: 'KERNEL',
    },
    retorno('O SO devolve em rax o código do erro com sinal negativo: −2 (−ENOENT).', '−2 (−ENOENT)'),
    {
      titulo: 'Biblioteca trata o erro',
      texto: 'A biblioteca guarda o código em errno (ENOENT: "No such file or directory") e retorna −1.',
      bloco: 'biblioteca', modo: 'USUARIO',
    },
    {
      titulo: 'Programa recebe −1',
      texto: 'fd = −1. O programa deve testar o retorno, por exemplo: if (fd < 0) perror("open");',
      bloco: 'aplicacao', modo: 'USUARIO', linha: 3,
    },
  ], 2);
  return {
    id: 'open-erro', nome: 'Abrir arquivo inexistente — open()', codigo,
    chamada: { unix: 'open', numero: 2, windows: 'CreateFile', tipo: 'Gerenciamento de arquivos' },
    passos,
  };
}

function cenarioPrivilegiada(): Cenario {
  const codigo = [
    'int main() {',
    '    asm("cli");   /* desabilitar interrupções */',
    '    return 0;',
    '}',
  ];
  const passos = montarPassos([
    {
      titulo: 'Programa tenta executar cli',
      texto: 'cli desabilita as interrupções. É uma instrução privilegiada, e o programa tenta executá-la diretamente, sem pedir ao SO.',
      bloco: 'aplicacao', modo: 'USUARIO',
    },
    {
      titulo: 'CPU recusa: exceção',
      texto: 'O bit de modo é 1 (usuário). A CPU não executa a instrução: gera uma exceção (trap de proteção), muda para o modo kernel e desvia para o SO.',
      bloco: 'cpu', modo: 'KERNEL', evento: 'EXCECAO', fronteira: DESCE_US_SO,
    },
    {
      titulo: 'SO trata a exceção',
      texto: 'O SO identifica a violação e envia ao processo o sinal SIGSEGV.',
      bloco: 'tratador', modo: 'KERNEL',
    },
    {
      titulo: 'Processo é finalizado',
      texto: 'Sem tratamento para o sinal, o processo é destruído. O pai dele (o shell) é avisado. As interrupções continuam habilitadas: o SO está protegido.',
      bloco: 'processos', modo: 'KERNEL', estado: 'Destruição', tela: 'Segmentation fault',
    },
    {
      titulo: 'Shell volta a executar',
      texto: 'O SO retorna ao modo usuário executando o shell (um programa de sistema), que mostra a mensagem. O programa nunca chega à linha seguinte.',
      bloco: 'sistema', modo: 'USUARIO', evento: 'RETORNO', fronteira: SOBE_US_SO, linha: -1,
    },
  ], 1);
  return {
    id: 'privilegiada', nome: 'Instrução privilegiada no modo usuário', codigo,
    chamada: null,
    passos,
  };
}

export const CENARIOS: Cenario[] = [
  cenarioWrite(),
  cenarioRead(),
  cenarioGetpid(),
  cenarioFork(),
  cenarioOpenErro(),
  cenarioPrivilegiada(),
];

/** Tipos de chamadas de sistema com exemplos UNIX × Windows (Silberschatz). */
export const TIPOS_CHAMADAS: { tipo: TipoChamada; pares: [string, string][] }[] = [
  { tipo: 'Controle de processos', pares: [['fork', 'CreateProcess'], ['exit', 'ExitProcess'], ['wait', 'WaitForSingleObject']] },
  { tipo: 'Gerenciamento de arquivos', pares: [['open', 'CreateFile'], ['read', 'ReadFile'], ['write', 'WriteFile'], ['close', 'CloseHandle']] },
  { tipo: 'Gerenciamento de dispositivos', pares: [['ioctl', 'SetConsoleMode'], ['read', 'ReadConsole'], ['write', 'WriteConsole']] },
  { tipo: 'Manutenção de informações', pares: [['getpid', 'GetCurrentProcessId'], ['alarm', 'SetTimer'], ['sleep', 'Sleep']] },
  { tipo: 'Comunicações', pares: [['pipe', 'CreatePipe'], ['shm_open', 'CreateFileMapping'], ['mmap', 'MapViewOfFile']] },
  { tipo: 'Proteção', pares: [['chmod', 'SetFileSecurity'], ['umask', 'InitializeSecurityDescriptor'], ['chown', 'SetSecurityDescriptorGroup']] },
];

/** Bit de modo (Silberschatz): kernel = 0, usuário = 1. */
export function bitDeModo(m: Modo): 0 | 1 {
  return m === 'KERNEL' ? 0 : 1;
}
