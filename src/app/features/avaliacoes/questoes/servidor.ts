/**
 * Ponto de entrada empacotado para a função "avaliacao" do Supabase
 * (npm run questoes:servidor → supabase/functions/avaliacao/questoes.js).
 * Só código puro: geradores, correção e validação do modelo.
 */
export { gerarProva, validarModelo } from './catalogo';
export { corrigirProva } from './corrigir';
