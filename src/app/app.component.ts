import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { animate, group, query, style, transition, trigger } from '@angular/animations';
import { Subscription, filter } from 'rxjs';
import { ArquitecturaService } from './services/arquitectura.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  hint: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const ICONS = {
  layers:   'M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5',
  plus:     'M12 5v14 M5 12h14',
  list:     'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
  diagram:  'M3 3h6v6H3z M15 3h6v6h-6z M9 15h6v6H9z M6 9v3h12V9 M12 12v3',
  sequence: 'M5 3v18 M19 3v18 M5 8h14 M19 13H5 M5 18h14',
  archi:    'M3 21h18 M5 21V9l7-6 7 6v12 M9 21v-6h6v6',
  tools:    'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z',
  doc:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  tag:      'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z M7 7h.01'
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [
    trigger('routeAnimation', [
      transition('* <=> *', [
        query(':enter, :leave', style({ position: 'absolute', left: 0, right: 0, top: 0 }), { optional: true }),
        query(':enter', style({ opacity: 0, transform: 'translateY(14px)', filter: 'blur(4px)' }), { optional: true }),
        group([
          query(':leave', animate('140ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' })), { optional: true }),
          query(':enter', animate('380ms 80ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            style({ opacity: 1, transform: 'none', filter: 'none' })), { optional: true })
        ])
      ])
    ]),
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('240ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('dropdown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px) scale(0.97)' }),
        animate('180ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'none' }))
      ]),
      transition(':leave', [
        animate('120ms ease-in', style({ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }))
      ])
    ]),
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('160ms ease-in', style({ opacity: 0 }))])
    ])
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'front-dinamic-architect';
  componenteCount = 0;

  readonly icons = ICONS;
  readonly navGroups: NavGroup[] = [
    {
      id: 'arquitectura',
      label: 'Arquitectura',
      icon: ICONS.layers,
      items: [
        { label: 'Alta', path: '/alta', icon: ICONS.plus, hint: 'Registrar componentes' },
        { label: 'Lista', path: '/lista', icon: ICONS.list, hint: 'Componentes y envío a API' }
      ]
    },
    {
      id: 'diagramas',
      label: 'Diagramas',
      icon: ICONS.diagram,
      items: [
        { label: 'Diagrama UML', path: '/secuencia', icon: ICONS.sequence, hint: 'Secuencia en PlantUML' },
        { label: 'ArchiMate', path: '/archimate', icon: ICONS.archi, hint: 'Modelo en XML' }
      ]
    },
    {
      id: 'herramientas',
      label: 'Herramientas',
      icon: ICONS.tools,
      items: [
        { label: 'Documento', path: '/documento', icon: ICONS.doc, hint: 'Documento de solución' },
        { label: 'Tags', path: '/tags', icon: ICONS.tag, hint: 'Consulta de CECO' }
      ]
    }
  ];

  sidebarCollapsed = false;
  mobileOpen = false;
  openGroups = new Set<string>(this.navGroups.map(g => g.id));
  openMenu: 'create' | 'user' | null = null;
  theme: 'light' | 'dark' = 'light';
  currentGroup?: NavGroup;
  currentItem?: NavItem;

  private subs = new Subscription();

  constructor(
    private arquitecturaService: ArquitecturaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.arquitecturaService.componentes$.subscribe(
        items => (this.componenteCount = items.length)
      )
    );

    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          this.syncCurrent(e.urlAfterRedirects);
          this.mobileOpen = false;
          this.openMenu = null;
        })
    );

    this.sidebarCollapsed = this.readPref('sidebar') === 'collapsed';
    const savedTheme = this.readPref('theme');
    const prefersDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light');
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ── Navegación ────────────────────────────────────────────
  toggleSidebar(): void {
    if (window.innerWidth <= 960) {
      this.mobileOpen = !this.mobileOpen;
      return;
    }
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.writePref('sidebar', this.sidebarCollapsed ? 'collapsed' : 'expanded');
  }

  toggleGroup(id: string): void {
    if (this.openGroups.has(id)) {
      this.openGroups.delete(id);
    } else {
      this.openGroups.add(id);
    }
  }

  isGroupActive(group: NavGroup): boolean {
    return this.currentGroup?.id === group.id;
  }

  routeKey(outlet: RouterOutlet): string {
    return outlet?.isActivated ? outlet.activatedRoute.routeConfig?.path ?? '' : '';
  }

  // ── Menús desplegables ────────────────────────────────────
  toggleMenu(menu: 'create' | 'user', event: Event): void {
    event.stopPropagation();
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.openMenu = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenu = null;
    this.mobileOpen = false;
  }

  // ── Tema ──────────────────────────────────────────────────
  toggleTheme(): void {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    this.writePref('theme', this.theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private syncCurrent(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.currentGroup = undefined;
    this.currentItem = undefined;
    for (const g of this.navGroups) {
      const item = g.items.find(i => i.path === path);
      if (item) {
        this.currentGroup = g;
        this.currentItem = item;
        this.openGroups.add(g.id);
        break;
      }
    }
  }

  private readPref(key: string): string | null {
    try {
      return localStorage.getItem(`architect.${key}`);
    } catch {
      return null;
    }
  }

  private writePref(key: string, value: string): void {
    try {
      localStorage.setItem(`architect.${key}`, value);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}
