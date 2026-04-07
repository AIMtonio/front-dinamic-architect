import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ArquitecturaService } from './services/arquitectura.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'architect-app';
  componenteCount = 0;
  private sub!: Subscription;

  constructor(private arquitecturaService: ArquitecturaService) {}

  ngOnInit(): void {
    this.sub = this.arquitecturaService.componentes$.subscribe(
      items => (this.componenteCount = items.length)
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
