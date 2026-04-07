import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Paso {
  descripcion: string;
}

@Component({
  selector: 'app-diagrama-secuencia',
  templateUrl: './diagrama-secuencia.component.html',
  styleUrl: './diagrama-secuencia.component.scss'
})
export class DiagramaSecuenciaComponent {
  titulo = '';
  contexto = '';
  actorPrincipal = '';
  pasos: Paso[] = [{ descripcion: '' }];

  generando = false;
  resultado = '';
  estado: 'idle' | 'ok' | 'error' = 'idle';
  mensajeError = '';
  resultadoCopiado = false;
  diagramaUrl: string | null = null;
  cargandoImagen = true;

  private readonly API_URL = `${environment.apiBaseUrl}/secuencia/uml/raw`;

  constructor(private http: HttpClient) {}

  agregarPaso(): void {
    this.pasos = [...this.pasos, { descripcion: '' }];
  }

  eliminarPaso(index: number): void {
    if (this.pasos.length === 1) return;
    this.pasos = this.pasos.filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  formValido(): boolean {
    return !!this.titulo.trim() && !!this.contexto.trim() &&
      !!this.actorPrincipal.trim() &&
      this.pasos.every(p => !!p.descripcion.trim());
  }

  generar(): void {
    if (!this.formValido()) return;
    this.generando = true;
    this.resultado = '';
    this.estado = 'idle';
    this.mensajeError = '';

    const body = {
      titulo: this.titulo.trim(),
      contexto: this.contexto.trim(),
      actorPrincipal: this.actorPrincipal.trim(),
      pasos: this.pasos.map(p => ({ descripcion: p.descripcion.trim() }))
    };

    this.http.post(this.API_URL, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        this.resultado = res;
        this.estado = 'ok';
        this.generando = false;
        this.diagramaUrl = this.plantUmlToUrl(res);
        this.cargandoImagen = true;
        this.descargarImagen(this.diagramaUrl);
      },
      error: (err) => {
        this.estado = 'error';
        this.mensajeError = `Error ${err.status}: ${err.message}`;
        this.generando = false;
      }
    });
  }

  copiarResultado(): void {
    navigator.clipboard.writeText(this.resultado).then(() => {
      this.resultadoCopiado = true;
      setTimeout(() => (this.resultadoCopiado = false), 2000);
    });
  }

  resetear(): void {
    this.titulo = '';
    this.contexto = '';
    this.actorPrincipal = '';
    this.pasos = [{ descripcion: '' }];
    this.resultado = '';
    this.estado = 'idle';
    this.mensajeError = '';
    this.diagramaUrl = null;
    this.cargandoImagen = true;
    this.resultadoCopiado = false;
  }

  onImagenCargada(): void {
    this.cargandoImagen = false;
  }

  private plantUmlToUrl(plantuml: string): string {
    const hex = Array.from(new TextEncoder().encode(plantuml))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `https://www.plantuml.com/plantuml/png/~h${hex}`;
  }

  private descargarImagen(url: string): void {
    const nombre = `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`;
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = nombre;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      })
      .catch(() => window.open(url, '_blank'));
  }
}
