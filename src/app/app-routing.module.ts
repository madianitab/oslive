import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePaginacaoPorDemandaExerciciosComponent } from 'src/app/features/paginacao/exercicios/components/home-paginacao/home-paginacao-por-demanda-exercicios.component';
import { LandingComponent } from './pages/landing/landing.component';
import { SimulacoesComponent } from './pages/simulacoes/simulacoes.component';
import { HomeEscalonamentoComponent } from 'src/app/features/escalonamento/simulador/components/home-escalonamento/home-escalonamento.component';
import { HomeSimuladorSegmentacaoComponent } from 'src/app/features/segmentacao/simulador/components/home-simulador-segmentacao/home-simulador-segmentacao.component';
import { HomeExercicioSegmentacaoComponent } from 'src/app/features/segmentacao/exercicios/components/home-exercicio-segmentacao/home-exercicio-segmentacao.component';
import { BrandkitComponent } from './pages/brandkit/brandkit.component';
import { HomeExercicioEscalonamentoComponent } from 'src/app/features/escalonamento/exercicios/components/home-exercicio-escalonamento/home-exercicio-escalonamento.component';
import { HomeSimuladorPaginacaoSimplesComponent } from 'src/app/features/paginacao/simulador-simples/components/home-simulador-paginacao-simples/home-simulador-paginacao-simples.component';
import { HomeExercicioPaginacaoSimplesComponent } from 'src/app/features/paginacao/exercicios-simples/components/home-exercicio-paginacao-simples/home-exercicio-paginacao-simples.component';
import { HomeSimuladorPaginacaoDemandaComponent } from 'src/app/features/paginacao/simulador-demanda/components/home-simulador-paginacao-demanda/home-simulador-paginacao-demanda.component';
import { HomeParticoesFixasComponent } from 'src/app/features/particoes/fixas/components/home-particoes-fixas/home-particoes-fixas.component';
import { HomeParticoesVariaveisComponent } from 'src/app/features/particoes/variaveis/components/home-particoes-variaveis/home-particoes-variaveis.component';
import { HomeEstadosComponent } from 'src/app/features/processos/estados/components/home-estados/home-estados.component';
import { exigirLogin } from './core/auth/auth.guard';
import { HomeArvoreComponent } from 'src/app/features/processos/arvore/components/home-arvore/home-arvore.component';

const routes: Routes = [
  { path: "", component: LandingComponent, pathMatch: 'full' },
  { path: "simulacoes", component: SimulacoesComponent },
  { path: "brandkit", component: BrandkitComponent },

  // Processos
  { path: "processos/estados", component: HomeEstadosComponent },
  { path: "processos/arvore", component: HomeArvoreComponent },

  // Escalonamento de Processos
  { path: "escalonamento/simulador", component: HomeEscalonamentoComponent },
  { path: "escalonamento/exercicios", component: HomeExercicioEscalonamentoComponent },

  // Partições (alocação contígua)
  { path: "particoes/fixas", component: HomeParticoesFixasComponent },
  { path: "particoes/variaveis", component: HomeParticoesVariaveisComponent },

  // Paginação
  { path: "paginacao/simulador-simples", component: HomeSimuladorPaginacaoSimplesComponent },
  { path: "paginacao/exercicios-simples", component: HomeExercicioPaginacaoSimplesComponent },
  { path: "paginacao/simulador-demanda", component: HomeSimuladorPaginacaoDemandaComponent },
  { path: "paginacao/exercicios", component: HomePaginacaoPorDemandaExerciciosComponent },

  // Segmentação
  { path: "segmentacao/simulador", component: HomeSimuladorSegmentacaoComponent },
  { path: "segmentacao/exercicios", component: HomeExercicioSegmentacaoComponent },

  // Avaliações (exigem login; carregadas só quando abertas)
  { path: "entrar", loadComponent: () => import('./pages/entrar/entrar.component').then(m => m.EntrarComponent) },
  { path: "avaliacoes", canActivate: [exigirLogin()], loadComponent: () => import('src/app/features/avaliacoes/components/home-avaliacoes/home-avaliacoes.component').then(m => m.HomeAvaliacoesComponent) },
  { path: "admin/usuarios", canActivate: [exigirLogin('admin')], loadComponent: () => import('./pages/admin-usuarios/admin-usuarios.component').then(m => m.AdminUsuariosComponent) },

  // Endereços antigos (mantidos para não quebrar links já compartilhados)
  { path: "EscalonamentoDeProcessos", redirectTo: "escalonamento/simulador" },
  { path: "PaginacaoPorDemandaExercicios", redirectTo: "paginacao/exercicios" },
  { path: "Segmentacao", redirectTo: "segmentacao/simulador" },
  { path: "ExercicioDeSegmentacao", redirectTo: "segmentacao/exercicios" },

  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
