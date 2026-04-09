import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { ComponenteItem } from '../../models/arquitectura.model';
import { ArquitecturaService } from '../../services/arquitectura.service';

@Component({
  selector: 'app-lista-arquitectura',
  templateUrl: './lista-arquitectura.component.html',
  styleUrl: './lista-arquitectura.component.scss'
})
export class ListaArquitecturaComponent implements OnInit, OnDestroy {
  componentes: ComponenteItem[] = [];
  jsonVisible = false;
  jsonCopiado = false;

  enviandoApi = false;
  apiEstado: 'idle' | 'ok' | 'error' = 'idle';
  apiMensaje = '';
  driveDownloadUrl: string | null = null;
  driveFileName: string | null = null;
  driveFileContent: string | null = null;

  private sub!: Subscription;
  private readonly API_URL = `${environment.apiBaseUrl}/diagram/from-json`;

  constructor(
    private arquitecturaService: ArquitecturaService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.sub = this.arquitecturaService.componentes$.subscribe(items => {
      this.componentes = items;
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  eliminar(index: number): void {
    this.arquitecturaService.eliminar(index);
  }

  limpiar(): void {
    if (!confirm(`¿Eliminar los ${this.componentes.length} componentes? Esta acción no se puede deshacer.`)) return;
    this.arquitecturaService.limpiar();
  }

  irAAlta(): void {
    this.router.navigate(['/alta']);
  }

  get jsonResultado(): string {
    return JSON.stringify(this.arquitecturaService.obtenerJson(), null, 2);
  }

  copiarJson(): void {
    navigator.clipboard.writeText(this.jsonResultado).then(() => {
      this.jsonCopiado = true;
      setTimeout(() => (this.jsonCopiado = false), 2000);
    });
  }

  tipoColor(tipo: string): string {
    const colores: Record<string, string> = {
      eks: 'badge-eks',
      lambda: 'badge-lambda',
      fargate: 'badge-fargate',
      ec2: 'badge-ec2'
    };
    return colores[tipo] ?? 'badge-default';
  }

  enviarApi(): void {
    this.enviandoApi = true;
    this.apiEstado = 'idle';
    this.apiMensaje = '';
    this.driveDownloadUrl = null;
    this.driveFileName = null;
    this.driveFileContent = null;
    const body = this.arquitecturaService.obtenerJson();
    this.http.post(this.API_URL, body, { responseType: 'text' }).subscribe({
      next: (res) => {
        this.apiEstado = 'ok';
        this.apiMensaje = 'Diagrama generado correctamente.';
        this.driveDownloadUrl = null;
        this.driveFileName = 'diagrama.drawio';
        this.driveFileContent = res;
        this.enviandoApi = false;
      },
      error: (err) => {
        this.apiEstado = 'error';
        this.apiMensaje = `Error ${err.status}: ${err.message}`;
        this.enviandoApi = false;
      }
    });
  }

  descargar(): void {
    const fileName = this.driveFileName ?? 'diagrama.drawio';
    if (this.driveFileContent) {
      const blob = new Blob([this.driveFileContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else if (this.driveDownloadUrl) {
      const a = document.createElement('a');
      a.href = this.driveDownloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = fileName;
      a.click();
    }
  }
}
