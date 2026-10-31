// Função "avaliacao" do Supabase (Deno): gera, salva e corrige as provas.
//
// O gabarito nunca sai daqui: o navegador recebe só a parte pública das questões.
// As regras de acesso (turma, horário, senha, tentativa única, prazo) ficam no banco,
// em funções que só o service_role executa (supabase/schema.sql, seção 9).
//
// questoes.js é gerado a partir do código do site (npm run questoes:servidor) e
// publicado junto pelo GitHub Action (.github/workflows/supabase-funcoes.yml).

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
// @ts-ignore: arquivo gerado no build
import { corrigirProva, gerarProva, validarModelo } from './questoes.js';

const ORIGENS = ['https://madianitab.github.io', 'http://localhost:4200'];
const MAX_QUESTOES = 20;
const MAX_CAMPO = 200;

const url = Deno.env.get('SUPABASE_URL')!;
const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(origem: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function ipDe(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return (xff?.split(',')[0] ?? req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? '').trim().slice(0, 100);
}

/** Só aceita { "0": { "campo": "texto" }, ... } com tamanhos limitados. */
function limparRespostas(r: unknown, quantidade: number): Record<string, Record<string, string>> {
  const saida: Record<string, Record<string, string>> = {};
  if (!r || typeof r !== 'object' || Array.isArray(r)) return saida;
  for (const [q, campos] of Object.entries(r as Record<string, unknown>)) {
    const i = Number(q);
    if (!Number.isInteger(i) || i < 0 || i >= Math.min(quantidade, MAX_QUESTOES)) continue;
    if (!campos || typeof campos !== 'object' || Array.isArray(campos)) continue;
    const limpo: Record<string, string> = {};
    for (const [id, v] of Object.entries(campos as Record<string, unknown>).slice(0, 200)) {
      if (typeof v === 'string' && id.length <= 40) limpo[id] = v.slice(0, MAX_CAMPO);
    }
    saida[String(i)] = limpo;
  }
  return saida;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpc(nome: string, args: Record<string, unknown>): Promise<any> {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

/** Corrige e grava. Respostas novas só valem dentro do prazo; depois, valem as salvas. */
async function finalizar(tentativa: number, aluno: string, novas: unknown, envio: 'aluno' | 'tempo', ip: string) {
  const t = await rpc('tentativa_para_correcao', { p_tentativa: tentativa, p_aluno: aluno });
  if (!t) return { erro: 'Prova não encontrada.' };
  if (t.enviada) return { erro: 'A prova já foi enviada.' };
  const modelo = validarModelo(t.modelo);
  const respostas = envio === 'aluno' && t.no_prazo && novas !== undefined
    ? limparRespostas(novas, modelo.length)
    : limparRespostas(t.respostas, modelo.length);
  const prova = gerarProva(modelo, t.semente);
  const c = corrigirProva(prova, respostas, Number(t.valor_total));
  const correcao = {
    questoes: c.questoes.map((q: any, i: number) => ({
      tipo: modelo[i].tipo, valor: q.valor, nota: q.nota, acertos: q.acertos, total: q.total, campos: q.campos,
    })),
  };
  return rpc('finalizar_tentativa', {
    p_tentativa: tentativa, p_aluno: aluno, p_respostas: respostas, p_nota: c.nota,
    p_correcao: correcao, p_envio: t.no_prazo ? envio : 'tempo', p_ip: ip,
  });
}

Deno.serve(async req => {
  const cab = cors(req.headers.get('origin'));
  const responder = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cab, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cab });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);

  try {
    // quem está chamando (o token do Google/Supabase é conferido no servidor de autenticação)
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u, error: erroUsuario } = await admin.auth.getUser(token);
    if (erroUsuario || !u?.user) return responder({ erro: 'Entre com sua conta para fazer a prova.' }, 401);
    const aluno = u.user.id;

    const corpo = await req.json().catch(() => ({}));
    const ip = ipDe(req);

    switch (corpo.acao) {
      case 'iniciar': {
        const r = await rpc('iniciar_tentativa', {
          p_avaliacao: Number(corpo.avaliacao), p_aluno: aluno, p_senha: String(corpo.senha ?? '').slice(0, 64),
          p_ip: ip, p_navegador: (req.headers.get('user-agent') ?? '').slice(0, 300),
        });
        if (r.erro) return responder({ erro: r.erro }, 400);
        if (r.esgotado) {
          await finalizar(r.id, aluno, undefined, 'tempo', ip);
          return responder({ erro: 'O tempo da prova terminou. As respostas salvas foram enviadas.' }, 400);
        }
        const modelo = validarModelo(r.modelo);
        const questoes = gerarProva(modelo, r.semente).map((q: any) => q.publica);
        return responder({
          tentativa: r.id, titulo: r.titulo, prazo: r.prazo, agora: r.agora,
          valor_total: r.valor_total, questoes, respostas: r.respostas ?? {},
        });
      }

      case 'salvar': {
        const r = await rpc('salvar_respostas', {
          p_tentativa: Number(corpo.tentativa), p_aluno: aluno, p_respostas: limparRespostas(corpo.respostas, MAX_QUESTOES),
        });
        return r.erro ? responder({ erro: r.erro }, 400) : responder(r);
      }

      case 'enviar': {
        const r = await finalizar(Number(corpo.tentativa), aluno, corpo.respostas, 'aluno', ip);
        // a nota não volta para o aluno (decisão da professora)
        return r.erro ? responder({ erro: r.erro }, 400) : responder({ ok: true });
      }

      default:
        return responder({ erro: 'Ação desconhecida.' }, 400);
    }
  } catch (e) {
    console.error(e);
    return responder({ erro: 'Erro no servidor da prova. Tente de novo.' }, 500);
  }
});
