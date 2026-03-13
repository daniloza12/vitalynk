// ============================================================
//  app.config.ts — Configuración principal de la aplicación
// ============================================================
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideTransloco,
  TranslocoLoader,
  Translation,
  TranslocoService,
} from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { httpInterceptor } from './core/interceptors/http.interceptor';
import { LanguageService } from './core/services/language.service';

class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error('[VitaLink]', error);
  }
}

@Injectable({ providedIn: 'root' })
class TranslocoHttpLoader implements TranslocoLoader {
  private http = new HttpClient(null as never);

  constructor(http: HttpClient) {
    this.http = http;
  }

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}

function initLanguage(
  langService: LanguageService,
  transloco: TranslocoService,
): () => Promise<void> {
  return () => {
    langService.init();
    return firstValueFrom(transloco.load(langService.currentLang()))
      .then(() => void 0)
      .catch(() => void 0);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([httpInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideTransloco({
      config: {
        availableLangs: ['es', 'en', 'pt-BR'],
        defaultLang: 'es',
        fallbackLang: 'es',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [LanguageService, TranslocoService],
      multi: true,
    },
  ],
};
