import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePaginacaoPorDemandaExerciciosComponent } from 'src/app/features/paginacao/exercicios/components/home-paginacao/home-paginacao-por-demanda-exercicios.component';
import { LandingComponent } from './pages/landing/landing.component';
import { SimulacoesComponent } from './pages/simulacoes/simulacoes.component';
import { HomeEscalonamentoComponent } from 'src/app/features/escalonamento/simulador/components/home-escalonamento/home-escalonamento.component';
import { HomeComponent as SegmentacaoHomeComponent } from 'src/app/features/segmentacao/simulador/components/home/home.component';
import { HomeExercicioDeSegmentacaoComponent } from 'src/app/features/segmentacao/exercicios/components/home-exercicio-de-segmentacao/home-exercicio-de-segmentacao.component';
import { BrandkitComponent } from './pages/brandkit/brandkit.component';

const routes: Routes = [
  { path: "", component: LandingComponent, pathMatch: 'full' },
  { path: "simulacoes", component: SimulacoesComponent },
  { path: "brandkit", component: BrandkitComponent },

  // Escalonamento de Processos
  { path: "escalonamento/simulador", component: HomeEscalonamentoComponent },

  // Paginação por Demanda
  { path: "paginacao/exercicios", component: HomePaginacaoPorDemandaExerciciosComponent },

  // Segmentação
  { path: "segmentacao/simulador", component: SegmentacaoHomeComponent },
  { path: "segmentacao/exercicios", component: HomeExercicioDeSegmentacaoComponent },

  // Endereços antigos (mantidos para não quebrar links já compartilhados)
  { path: "EscalonamentoDeProcessos", redirectTo: "escalonamento/simulador" },
  { path: "PaginacaoPorDemandaExercicios", redirectTo: "paginacao/exercicios" },
  { path: "Segmentacao", redirectTo: "segmentacao/simulador" },
  { path: "ExercicioDeSegmentacao", redirectTo: "segmentacao/exercicios" },

  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
