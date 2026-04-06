import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ComponenteItem, TipoComponente } from '../../models/arquitectura.model';
import { ArquitecturaService } from '../../services/arquitectura.service';

@Component({
  selector: 'app-alta-arquitectura',
  templateUrl: './alta-arquitectura.component.html',
  styleUrl: './alta-arquitectura.component.scss'
})
export class AltaArquitecturaComponent {
  nombre = '';
  tipo: TipoComponente = 'eks';
  tiposDisponibles: TipoComponente[] = ['eks', 'lambda', 'fargate', 'ec2'];
  errorNombre = false;

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
}
