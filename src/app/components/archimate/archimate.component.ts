import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface NamedItem { name: string; }

@Component({
  selector: 'app-archimate',
  templateUrl: './archimate.component.html',
  styleUrl: './archimate.component.scss'
})
export class ArchimateComponent {
  businessActors: NamedItem[] = [{ name: '' }];
  drivers: NamedItem[]       = [{ name: '' }];
  goals: NamedItem[]         = [{ name: '' }];
  principles: NamedItem[]    = [{ name: '' }];
  courseOfActions: NamedItem[] = [{ name: '' }];

  generando = false;
  estado: 'idle' | 'ok' | 'error' = 'idle';
  mensajeError = '';

  private readonly API_URL = `${environment.apiBaseUrl}/archimate/from-json`;

  constructor(private http: HttpClient) {}

  // ── helpers genéricos ──────────────────────────────────────
  agregar(lista: NamedItem[]): void   { lista.push({ name: '' }); }
  eliminar(lista: NamedItem[], i: number): void {
    if (lista.length > 1) lista.splice(i, 1);
  }
  trackByIndex(index: number): number { return index; }

  formValido(): boolean {
    const filled = (arr: NamedItem[]) => arr.every(x => !!x.name.trim());
    return filled(this.businessActors) && filled(this.drivers) &&
           filled(this.goals) && filled(this.principles) && filled(this.courseOfActions);
  }

  generar(): void {
    if (!this.formValido()) return;
    this.generando = true;
    this.estado = 'idle';
    this.mensajeError = '';

    const trim = (arr: NamedItem[]) => arr.map(x => ({ name: x.name.trim() }));
    const body = {
      businessActors:  trim(this.businessActors),
      drivers:         trim(this.drivers),
      goals:           trim(this.goals),
      principles:      trim(this.principles),
      courseOfActions: trim(this.courseOfActions)
    };

    this.http.post(this.API_URL, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        this.estado = 'ok';
        this.generando = false;
        this.descargar(res, 'archimate-model.xml');
      },
      error: (err) => {
        this.estado = 'error';
        this.mensajeError = `Error ${err.status}: ${err.message}`;
        this.generando = false;
      }
    });
  }

  private descargar(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
