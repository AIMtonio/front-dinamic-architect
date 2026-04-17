import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface CecoItem {
  ceco: string;
  nombreCorto: string;
  nombreLargo: string;
  responsable: string;
}

@Component({
  selector: 'app-tags',
  templateUrl: './tags.component.html',
  styleUrl: './tags.component.scss'
})
export class TagsComponent {
  textoBusqueda = '';
  projectId = '';
  bussinesunit = '';
  owner = '';
  costCenter = '';
  aplication = '';
  creationDate = '';
  lifecycle = '';
  tier = '';
  shared = '';
  imagenPreview = '';
  cargando = false;
  estado: 'idle' | 'ok' | 'error' = 'idle';
  mensaje = '';
  resultados: CecoItem[] = [];
  cecoSeleccionado = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRequestId = 0;

  private readonly API_URL = `${environment.apiBaseUrl}/ceco/search?q=`;

  constructor(private http: HttpClient) {}

  onTextoBusquedaChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const valor = this.textoBusqueda.trim();
    if (!valor) {
      this.estado = 'idle';
      this.mensaje = '';
      this.resultados = [];
      this.cecoSeleccionado = '';
      this.costCenter = '';
      this.cargando = false;
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.consultar(valor);
    }, 350);
  }

  consultar(valorBusqueda?: string): void {
    const valor = (valorBusqueda ?? this.textoBusqueda).trim();

    if (!valor) {
      this.estado = 'error';
      this.mensaje = 'Ingresa un texto para consultar.';
      this.resultados = [];
      this.cecoSeleccionado = '';
      this.costCenter = '';
      return;
    }

    const requestId = ++this.lastRequestId;
    this.cargando = true;
    this.estado = 'idle';
    this.mensaje = '';
    this.cecoSeleccionado = '';
    this.costCenter = '';

    const url = `${this.API_URL}${encodeURIComponent(valor)}`;

    this.http.get<CecoItem[]>(url, {}).subscribe({
      next: (res) => {
        if (requestId !== this.lastRequestId) {
          return;
        }

        this.cargando = false;
        this.resultados = Array.isArray(res) ? res : [];
        this.cecoSeleccionado = '';
        this.costCenter = '';

        if (this.resultados.length > 0) {
          this.estado = 'ok';
          this.mensaje = `Se encontraron ${this.resultados.length} resultado(s).`;
        } else {
          this.estado = 'error';
          this.mensaje = 'No se encontraron CECO para el texto consultado.';
        }
      },
      error: (err) => {
        if (requestId !== this.lastRequestId) {
          return;
        }

        this.cargando = false;
        this.estado = 'error';
        this.mensaje = `Error ${err.status ?? ''}: ${err.message ?? 'No se pudo consultar el servicio.'}`.trim();
      }
    });
  }

  seleccionarCeco(item: CecoItem): void {
    this.cecoSeleccionado = item.ceco;
    this.costCenter = item.ceco;
  }

  generar(): void {
    const filas: Array<{ clave: string; valor: string }> = [
      { clave: 'ProjectId', valor: this.projectId || '-' },
      { clave: 'Bussinesunit', valor: this.bussinesunit || '-' },
      { clave: 'Owner', valor: this.owner || '-' },
      { clave: 'Texto a consultar', valor: this.textoBusqueda || '-' },
      { clave: 'CostCenter', valor: this.costCenter || '-' },
      { clave: 'Aplication', valor: this.aplication || '-' },
      { clave: 'CreationDate', valor: this.creationDate || '-' },
      { clave: 'Lifecycle', valor: this.lifecycle || '-' },
      { clave: 'Tier', valor: this.tier || '-' },
      { clave: 'Shared', valor: this.shared || '-' }
    ];

    const ancho = 1100;
    const altoHeader = 58;
    const altoFila = 48;
    const alto = altoHeader + filas.length * altoFila;
    const mitad = ancho / 2;

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const azulMarino = '#001a4d';
    const blanco = '#ffffff';
    const centroClave = mitad / 2;
    const centroValor = mitad + mitad / 2;

    ctx.fillStyle = blanco;
    ctx.fillRect(0, 0, ancho, alto);

    ctx.fillStyle = azulMarino;
    ctx.fillRect(0, 0, ancho, altoHeader);

    ctx.strokeStyle = azulMarino;
    ctx.lineWidth = 1;

    ctx.font = '700 22px Arial';
    ctx.fillStyle = blanco;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Clave', centroClave, altoHeader / 2);
    ctx.fillText('Valor', centroValor, altoHeader / 2);

    ctx.font = '500 20px Arial';
    ctx.fillStyle = azulMarino;

    filas.forEach((fila, index) => {
      const y = altoHeader + index * altoFila;
      const yCentro = y + altoFila / 2;

      ctx.fillStyle = blanco;
      ctx.fillRect(0, y, ancho, altoFila);

      ctx.fillStyle = azulMarino;
      ctx.fillText(this.ajustarTexto(ctx, fila.clave, mitad - 24), centroClave, yCentro);
      ctx.fillText(this.ajustarTexto(ctx, fila.valor, mitad - 24), centroValor, yCentro);
    });

    for (let i = 0; i <= filas.length; i++) {
      const y = altoHeader + i * altoFila;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ancho, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ancho, 0);
    ctx.lineTo(ancho, alto);
    ctx.lineTo(0, alto);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mitad, 0);
    ctx.lineTo(mitad, alto);
    ctx.stroke();

    this.imagenPreview = canvas.toDataURL('image/png');
  }

  exportarImagen(): void {
    if (!this.imagenPreview) {
      return;
    }

    const link = document.createElement('a');
    link.href = this.imagenPreview;
    link.download = `tags-${Date.now()}.png`;
    link.click();
  }

  private ajustarTexto(ctx: CanvasRenderingContext2D, valor: string, maxWidth: number): string {
    if (ctx.measureText(valor).width <= maxWidth) {
      return valor;
    }

    let texto = valor;
    while (texto.length > 0 && ctx.measureText(`${texto}...`).width > maxWidth) {
      texto = texto.slice(0, -1);
    }

    return `${texto}...`;
  }
}
