// ============================================================
//  lang-switcher.component.ts
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ls" [class.ls--open]="isOpen()" [class.ls--right]="openRight" (click)="$event.stopPropagation()">
      <!-- Trigger pill -->
      <button class="ls__trigger" (click)="toggle()" aria-haspopup="listbox"
              [attr.aria-expanded]="isOpen()">
        <span aria-hidden="true">🌐</span>
        <span class="ls__code">{{ currentCode() }}</span>
        <span class="ls__chevron" aria-hidden="true">▾</span>
      </button>

      <!-- Panel -->
      @if (isOpen()) {
        <ul class="ls__panel" role="listbox">
          @for (opt of options; track opt.value) {
            <li class="ls__option"
                [class.ls__option--active]="lang.currentLang() === opt.value"
                role="option"
                [attr.aria-selected]="lang.currentLang() === opt.value"
                (click)="select(opt.value)">
              <span class="ls__flag" aria-hidden="true">{{ opt.flag }}</span>
              <span class="ls__name">{{ opt.label }}</span>
              @if (lang.currentLang() === opt.value) {
                <span class="ls__check" aria-hidden="true">✓</span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .ls {
      position: relative;
      display: inline-block;
    }

    .ls__trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-full, 9999px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-semibold, 600);
      letter-spacing: 0.04em;
      transition: border-color 0.2s, background 0.2s;

      &:hover {
        border-color: rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .ls__code {
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-bold, 700);
    }

    .ls__chevron {
      font-size: 0.65rem;
      transition: transform 0.2s ease;
      display: inline-block;
    }

    .ls--open .ls__chevron {
      transform: rotate(180deg);
    }

    .ls__panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 160px;
      background: var(--color-surface, #1e2a3a);
      border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius-md, 8px);
      box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.4));
      list-style: none;
      margin: 0;
      padding: 4px;
      z-index: 100;
      animation: ls-drop 0.15s ease;
    }

    .ls--right .ls__panel {
      right: auto;
      left: 0;
    }

    @keyframes ls-drop {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ls__option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
      font-size: var(--text-sm, 0.875rem);
      color: rgba(255, 255, 255, 0.75);
      transition: background 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.95);
      }

      &--active {
        background: rgba(var(--color-primary-rgb, 0, 82, 204), 0.15);
        color: var(--color-white, #fff);
      }
    }

    .ls__flag {
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .ls__name {
      flex: 1;
    }

    .ls__check {
      color: var(--color-primary, #0052CC);
      font-weight: var(--font-bold, 700);
      font-size: 0.8rem;
    }
  `],
})
export class LangSwitcherComponent {
  lang   = inject(LanguageService);
  isOpen = signal(false);

  /** Abre el panel hacia la derecha (alineado al borde izquierdo del trigger) */
  @Input() openRight = false;

  readonly options = [
    { value: 'es',    flag: '🇪🇸', label: 'Español'   },
    { value: 'en',    flag: '🇬🇧', label: 'English'   },
    { value: 'pt-BR', flag: '🇧🇷', label: 'Português' },
  ] as const;

  currentCode = computed(() => {
    const map: Record<string, string> = { 'es': 'ES', 'en': 'EN', 'pt-BR': 'PT' };
    return map[this.lang.currentLang()] ?? 'ES';
  });

  toggle() { this.isOpen.update(v => !v); }

  select(value: string): void {
    this.lang.setLang(value as 'es' | 'en' | 'pt-BR');
    this.isOpen.set(false);
  }

  @HostListener('document:click')
  onOutsideClick(): void { this.isOpen.set(false); }
}
