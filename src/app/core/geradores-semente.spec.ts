import { criarAleatorio } from './aleatorio';
import { gerarProcessosEscalonamento } from '../features/escalonamento/models/exercicio-escalonamento';
import { gerarPaginacaoSimples, paginasNecessarias } from '../features/paginacao/models/exercicio-paginacao-simples';
import { calcularVitimaPaginacao, gerarPaginacaoDemanda } from '../features/paginacao/models/exercicio-paginacao-demanda';
import { gerarSegmentacao, gerarTabelaSegmentos4 } from '../features/segmentacao/models/exercicio-segmentacao';
import { gerarAlocacao, gerarCompactacao, gerarFixas, gerarLacunas } from '../features/particoes/models/exercicios-particoes';
import { gerarProcessos } from '../features/processos/models/estados';
import { gerarFilaInicial } from '../features/paginacao/models/segunda-chance-sequencia';
import { TAM } from './constantes';

/**
 * Todos os geradores de exercício usados nas avaliações: a mesma semente
 * precisa gerar exatamente o mesmo exercício (o servidor gera de novo para corrigir).
 */
const GERADORES: [string, (s: string) => unknown][] = [
  ['escalonamento', s => gerarProcessosEscalonamento(criarAleatorio(s))],
  ['paginação simples (tradução)', s => gerarPaginacaoSimples('TRADUCAO', criarAleatorio(s))],
  ['paginação simples (memória física)', s => gerarPaginacaoSimples('MEMORIA_FISICA', criarAleatorio(s))],
  ['paginação por demanda (lógica)', s => gerarPaginacaoDemanda('LOGICA', 4, criarAleatorio(s))],
  ['paginação por demanda (vítima)', s => gerarPaginacaoDemanda('VITIMA', 4, criarAleatorio(s))],
  ['segunda chance (fila inicial)', s => gerarFilaInicial('SC', criarAleatorio(s))],
  ['segmentação (tradução)', s => gerarSegmentacao('TRADUCAO', criarAleatorio(s))],
  ['segmentação (alocação)', s => gerarSegmentacao('ALOCACAO', criarAleatorio(s))],
  ['segmentação (tabela com 4 processos)', s => gerarTabelaSegmentos4(criarAleatorio(s))],
  ['partições fixas', s => gerarFixas('FIRST', criarAleatorio(s))],
  ['partições variáveis (alocação)', s => gerarAlocacao('BEST', criarAleatorio(s))],
  ['partições variáveis (lacunas)', s => gerarLacunas(criarAleatorio(s))],
  ['partições variáveis (compactação)', s => gerarCompactacao(criarAleatorio(s))],
  ['estados do processo', s => gerarProcessos({ quantidade: 4, quantum: 2, especiais: true }, criarAleatorio(s))],
];

/** Serializa sem referências circulares (processo dentro da pergunta etc.). */
function json(v: unknown): string {
  const vistos = new WeakSet<object>();
  return JSON.stringify(v, (_k, x) => {
    if (x && typeof x === 'object') {
      if (vistos.has(x)) return '[ref]';
      vistos.add(x);
    }
    return x;
  });
}

describe('geradores com semente', () => {
  for (const [nome, gerar] of GERADORES) {
    it(`${nome}: mesma semente, mesmo exercício; semente diferente, outro exercício`, () => {
      expect(json(gerar('prova-7:ana@x.com'))).toBe(json(gerar('prova-7:ana@x.com')));
      const variados = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(s => json(gerar(s))));
      expect(variados.size).toBeGreaterThan(1);
    });
  }

  it('paginação simples respeita as regras do exercício', () => {
    for (let s = 0; s < 100; s++) {
      const ex = gerarPaginacaoSimples('MEMORIA_FISICA', criarAleatorio(s));
      const quadros = ex.processos.reduce((t, p) => t + p.quadros.length, 0);
      expect(quadros).toBeLessThanOrEqual(6);
      expect(paginasNecessarias(ex.processos[0].bytes)).toBeGreaterThanOrEqual(2);
      expect(ex.processos[ex.alvoMemoria].quadros.length).toBeGreaterThanOrEqual(2);
      expect(ex.perguntas.length).toBe(4);
    }
  });

  it('paginação por demanda (vítima): memória cheia, página solicitada fora dela e vítima definida', () => {
    for (let s = 0; s < 100; s++) {
      const ex = gerarPaginacaoDemanda('VITIMA', 4, criarAleatorio(s));
      expect(ex.quadros.filter(q => q).length).toBe(TAM);
      expect(ex.paginaSolicitada?.quadro).toBeNull();
      expect(calcularVitimaPaginacao(ex.quadros, 'HISTORICO')).not.toBeNull();
    }
  });

  it('segmentação: a pergunta com interrupção tem deslocamento ≥ limite', () => {
    for (let s = 0; s < 50; s++) {
      const ex = gerarSegmentacao('TRADUCAO', criarAleatorio(s));
      const erro = ex.perguntas.filter(q => {
        const seg = q.processo.segmentos.find(x => x.numero === q.segmento)!;
        return q.deslocamento >= seg.tamanho;
      });
      expect(erro.length).toBeGreaterThanOrEqual(1);
    }
  });
});
