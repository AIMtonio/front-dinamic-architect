import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DocumentoResponse {
  html: string;
}

@Component({
  selector: 'app-documento',
  templateUrl: './documento.component.html',
  styleUrl: './documento.component.scss'
})
export class DocumentoComponent {
  problematica = '';
  cargando = false;
  estado: 'idle' | 'ok' | 'error' = 'idle';
  mensaje = '';
  htmlResultado = '';

  private readonly API_URL = `${environment.apiBaseUrl}/document/generate-problem`;

  constructor(private http: HttpClient) {}

  procesar(): void {
    const valor = this.problematica.trim();
    if (!valor) {
      this.estado = 'error';
      this.mensaje = 'Ingresa una problematica antes de procesar.';
      this.htmlResultado = '';
      return;
    }

    this.cargando = true;
    this.estado = 'idle';
    this.mensaje = '';
    this.htmlResultado = '';

    this.http.post<DocumentoResponse>(this.API_URL, { problematica: valor }).subscribe({
      next: (res) => {
        this.cargando = false;
        this.estado = 'ok';
        this.mensaje = 'Documento generado correctamente.';
        this.htmlResultado = res?.html ?? '';
      },
      error: (err) => {
        this.cargando = false;
        this.estado = 'error';
        this.mensaje = `Error ${err.status ?? ''}: ${err.message ?? 'No se pudo generar el documento.'}`.trim();
      }
    });
  }
}
