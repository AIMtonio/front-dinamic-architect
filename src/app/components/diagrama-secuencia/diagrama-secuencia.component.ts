import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Paso {
  descripcion: string;
}

interface GeneratedFileResponse {
  filename?: string;
  mimeType?: string;
  fileBase64?: string;
}

interface SequenceUmlResponse {
  message?: string;
  data?: {
    uml?: string;
    [key: string]: unknown;
  };
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
        const processed = this.processSequenceResponse(res);
        this.resultado = processed.content;
        this.estado = 'ok';
        this.generando = false;

        if (processed.mimeType.startsWith('image/')) {
          this.diagramaUrl = null;
          this.cargandoImagen = false;
          this.descargarArchivo(processed.content, processed.fileName, processed.mimeType);
          return;
        }

        this.diagramaUrl = this.plantUmlToUrl(processed.content);
        this.cargandoImagen = true;
        this.descargarImagen(this.diagramaUrl, processed.fileName);
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

  private descargarImagen(url: string, fileName?: string): void {
    const nombre = fileName || `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`;
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

  private processSequenceResponse(responseText: string): {
    fileName: string;
    mimeType: string;
    content: string;
  } {
    const parsed = this.tryParseJson(responseText);
    if (!parsed || typeof parsed !== 'object') {
      return {
        fileName: `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`,
        mimeType: 'text/plain',
        content: responseText
      };
    }

    const response = parsed as GeneratedFileResponse;
    const sequenceResponse = parsed as SequenceUmlResponse;

    if (sequenceResponse.data?.uml) {
      return {
        fileName: `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`,
        mimeType: 'text/plain',
        content: sequenceResponse.data.uml
      };
    }

    if (!response.fileBase64) {
      return {
        fileName: response.filename || `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`,
        mimeType: response.mimeType || 'text/plain',
        content: responseText
      };
    }

    return {
      fileName: response.filename || `diagrama-${this.titulo.trim().replace(/\s+/g, '-') || 'secuencia'}.png`,
      mimeType: response.mimeType || 'text/plain',
      content: this.decodeBase64ToUtf8(response.fileBase64)
    };
  }

  private descargarArchivo(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private decodeBase64ToUtf8(base64Value: string): string {
    const binary = atob(base64Value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
}
