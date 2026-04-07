import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AltaArquitecturaComponent } from './components/alta-arquitectura/alta-arquitectura.component';
import { ListaArquitecturaComponent } from './components/lista-arquitectura/lista-arquitectura.component';
import { DiagramaSecuenciaComponent } from './components/diagrama-secuencia/diagrama-secuencia.component';
import { ArchimateComponent } from './components/archimate/archimate.component';

@NgModule({
  declarations: [
    AppComponent,
    AltaArquitecturaComponent,
    ListaArquitecturaComponent,
    DiagramaSecuenciaComponent,
    ArchimateComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

