// ============================================================
//  language.service.ts — Gestión del idioma activo
// ============================================================
import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const STORAGE_KEY = 'vl_lang';
const AVAILABLE    = ['es', 'en', 'pt-BR'] as const;
type Lang = typeof AVAILABLE[number];

function detectBrowserLang(): Lang {
  const nav = navigator.language || 'es';
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('pt')) return 'pt-BR';
  return 'es';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);

  readonly availableLangs: Lang[] = [...AVAILABLE];
  readonly currentLang = signal<Lang>(this.resolveInitialLang());

  private resolveInitialLang(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (AVAILABLE as readonly string[]).includes(stored)) return stored;
    return detectBrowserLang();
  }

  /** Llama en APP_INITIALIZER para aplicar el idioma antes del primer render */
  init(): void {
    this.transloco.setActiveLang(this.currentLang());
  }

  setLang(lang: Lang): void {
    this.currentLang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.transloco.setActiveLang(lang);
  }
}
