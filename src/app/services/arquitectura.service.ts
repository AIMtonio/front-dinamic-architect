import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Arquitectura, ComponenteItem, TipoComponente } from '../models/arquitectura.model';

@Injectable({
  providedIn: 'root'
})
export class ArquitecturaService {
  private componentes: ComponenteItem[] = [];
  private componentesSubject = new BehaviorSubject<ComponenteItem[]>([]);

  componentes$ = this.componentesSubject.asObservable();

  agregar(item: ComponenteItem): void {
    this.componentes = [...this.componentes, item];
    this.componentesSubject.next(this.componentes);
  }

  eliminar(index: number): void {
    this.componentes = this.componentes.filter((_, i) => i !== index);
    this.componentesSubject.next(this.componentes);
  }

  obtenerJson(): Arquitectura {
    return {
      componentes: this.componentes.map(c => c.nombre),
      tipo: this.componentes.map(c => c.tipo as TipoComponente)
    };
  }

  limpiar(): void {
    this.componentes = [];
    this.componentesSubject.next([]);
  }
}
