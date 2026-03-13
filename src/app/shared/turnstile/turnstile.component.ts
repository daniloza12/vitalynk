// ============================================================
//  turnstile.component.ts — Widget Cloudflare Turnstile
//  Carga el script de forma lazy y renderiza el desafío.
//  Uso:
//    <app-turnstile (resolved)="onToken($event)" (errored)="onError()" />
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    turnstile: {
      render:  (el: HTMLElement, opts: TurnstileOptions) => string;
      reset:   (id: string) => void;
      remove:  (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey:             string;
  theme?:              'light' | 'dark' | 'auto';
  callback?:           (token: string) => void;
  'error-callback'?:   () => void;
  'expired-callback'?: () => void;
}

@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `<div #container></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  /** Tema visual del widget */
  @Input() theme: 'light' | 'dark' | 'auto' = 'dark';

  /** Emite el token cuando el desafío se resuelve (string vacío = expirado) */
  @Output() resolved = new EventEmitter<string>();

  /** Emite cuando ocurre un error en el widget */
  @Output() errored  = new EventEmitter<void>();

  private widgetId: string | undefined;

  ngOnInit(): void {
    this.loadScript().then(() => this.renderWidget());
  }

  ngOnDestroy(): void {
    if (this.widgetId !== undefined) {
      window.turnstile?.remove(this.widgetId);
    }
  }

  /** Reinicia el desafío (llamar desde el padre tras un error de submit) */
  reset(): void {
    if (this.widgetId !== undefined) {
      window.turnstile?.reset(this.widgetId);
    }
  }

  // ── Privados ────────────────────────────────────────────────

  private renderWidget(): void {
    this.widgetId = window.turnstile.render(this.container.nativeElement, {
      sitekey:             environment.turnstileSiteKey,
      theme:               this.theme,
      callback:            (token) => this.resolved.emit(token),
      'error-callback':    ()      => this.errored.emit(),
      'expired-callback':  ()      => this.resolved.emit(''),
    });
  }

  /** Carga el script de Turnstile una sola vez, sin importar cuántas
   *  instancias del componente haya en la página. */
  private loadScript(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Ya cargado
      if (window.turnstile) { resolve(); return; }

      // Script en vuelo — encadenar al callback existente
      if (document.getElementById('cf-turnstile-script')) {
        const prev = window.onTurnstileLoad;
        window.onTurnstileLoad = () => { prev?.(); resolve(); };
        return;
      }

      // Primera carga
      window.onTurnstileLoad = () => resolve();
      const script = document.createElement('script');
      script.id    = 'cf-turnstile-script';
      script.src   = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
                   + '?onload=onTurnstileLoad&render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });
  }
}
