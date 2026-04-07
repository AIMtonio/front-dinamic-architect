import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { ComponenteItem, TipoComponente } from '../../models/arquitectura.model';
import { ArquitecturaService } from '../../services/arquitectura.service';

@Component({
  selector: 'app-alta-arquitectura',
  templateUrl: './alta-arquitectura.component.html',
  styleUrl: './alta-arquitectura.component.scss'
})
export class AltaArquitecturaComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  nombre = '';
  tipo: TipoComponente = 'eks';
  tiposDisponibles: TipoComponente[] = ['eks', 'lambda', 'fargate', 'ec2'];
  errorNombre = false;

  // Excel
  excelPreview: ComponenteItem[] = [];
  excelError = '';
  excelNombreArchivo = '';
  arrastreActivo = false;

  constructor(
    private arquitecturaService: ArquitecturaService,
    private router: Router
  ) {}

  agregar(): void {
    if (!this.nombre.trim()) {
      this.errorNombre = true;
      return;
    }
    this.errorNombre = false;
    const item: ComponenteItem = { nombre: this.nombre.trim(), tipo: this.tipo };
    this.arquitecturaService.agregar(item);
    this.nombre = '';
    this.tipo = 'eks';
  }

  irALista(): void {
    this.router.navigate(['/lista']);
  }

  // ── Excel ─────────────────────────────────────────────────

  abrirSelector(): void {
    this.fileInput.nativeElement.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivo(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.arrastreActivo = true;
  }

  onDragLeave(): void {
    this.arrastreActivo = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastreActivo = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.procesarArchivo(file);
  }

  private procesarArchivo(file: File): void {
    this.excelError = '';
    this.excelPreview = [];

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      this.excelError = 'Solo se aceptan archivos .xlsx, .xls o .csv';
      return;
    }

    this.excelNombreArchivo = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filas: any[][] = XLSX.utils.sheet_to_json(hoja, { header: 1 });

        const tiposValidos = new Set<string>(this.tiposDisponibles);
        const resultado: ComponenteItem[] = [];
        const errores: string[] = [];

        filas.forEach((fila, idx) => {
          if (idx === 0) return; // saltar encabezado
          const nombre = String(fila[0] ?? '').trim();
          const tipo   = String(fila[1] ?? '').trim().toLowerCase();
          if (!nombre) return;
          if (!tiposValidos.has(tipo)) {
            errores.push(`Fila ${idx + 1}: tipo "${tipo}" no válido (eks, lambda, fargate, ec2)`);
            return;
          }
          resultado.push({ nombre, tipo: tipo as TipoComponente });
        });

        if (errores.length) {
          this.excelError = errores.join(' | ');
        }
        this.excelPreview = resultado;
      } catch {
        this.excelError = 'No se pudo leer el archivo. Verifica el formato.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  importarExcel(): void {
    this.excelPreview.forEach(item => this.arquitecturaService.agregar(item));
    this.excelPreview = [];
    this.excelNombreArchivo = '';
    this.excelError = '';
    this.fileInput.nativeElement.value = '';
    this.router.navigate(['/lista']);
  }

  descartarExcel(): void {
    this.excelPreview = [];
    this.excelNombreArchivo = '';
    this.excelError = '';
    this.fileInput.nativeElement.value = '';
  }
}
