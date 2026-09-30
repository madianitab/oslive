import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePaginacaoPorDemandaExerciciosComponent } from 'src/app/features/paginacao/components/home-paginacao/home-paginacao-por-demanda-exercicios.component';
import { HomeProjectComponent } from './pages/home-project/home-project.component';
import { HomeEscalonamentoComponent } from 'src/app/features/escalonamento/components/home-escalonamento/home-escalonamento.component';
import { HomeComponent as SegmentacaoHomeComponent } from 'src/app/features/segmentacao/components/home/home.component';
import { HomeExercicioDeSegmentacaoComponent } from 'src/app/features/segmentacao/components/home-exercicio-de-segmentacao/home-exercicio-de-segmentacao.component';

const routes: Routes = [
  { path: "", component: HomeProjectComponent, pathMatch: 'full' },
  { path: "PaginacaoPorDemandaExercicios", component: HomePaginacaoPorDemandaExerciciosComponent },
  { path: "EscalonamentoDeProcessos", component: HomeEscalonamentoComponent },
  { path: "Segmentacao", component: SegmentacaoHomeComponent },
  { path: "ExercicioDeSegmentacao", component: HomeExercicioDeSegmentacaoComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
