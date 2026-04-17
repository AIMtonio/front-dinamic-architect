import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AltaArquitecturaComponent } from './components/alta-arquitectura/alta-arquitectura.component';
import { ListaArquitecturaComponent } from './components/lista-arquitectura/lista-arquitectura.component';
import { DiagramaSecuenciaComponent } from './components/diagrama-secuencia/diagrama-secuencia.component';
import { ArchimateComponent } from './components/archimate/archimate.component';
import { DocumentoComponent } from './components/documento/documento.component';
import { TagsComponent } from './components/tags/tags.component';

const routes: Routes = [
  { path: '', redirectTo: 'alta', pathMatch: 'full' },
  { path: 'alta', component: AltaArquitecturaComponent },
  { path: 'lista', component: ListaArquitecturaComponent },
  { path: 'secuencia', component: DiagramaSecuenciaComponent },
  { path: 'archimate', component: ArchimateComponent },
  { path: 'documento', component: DocumentoComponent },
  { path: 'tags', component: TagsComponent },
  { path: '**', redirectTo: 'alta' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

