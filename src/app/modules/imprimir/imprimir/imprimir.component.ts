import { Component, computed, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';

interface PurposeOption {
  value: string;
  icon:  string;
  label: string;
  hint:  string;
}

interface ColorTheme {
  value:  string;
  label:  string;
  bg:     string;
  text:   string;
  accent: string;
  invertQr: boolean;
}

@Component({
  selector: 'app-imprimir',
  standalone: true,
  imports: [NgStyle, TranslocoModule],
  templateUrl: './imprimir.component.html',
  styleUrl:    './imprimir.component.scss',
})
export class ImprimirComponent {
  private auth = inject(AuthService);

  account = this.auth.currentUser;

  /* ── Opciones de propósito ──────────────────────────────────── */
  purposeOptions: PurposeOption[] = [
    { value: 'medica',   icon: '🆔', label: 'imprimir.purpose_medica',   hint: '' },
    { value: 'objetos',  icon: '🔑', label: 'imprimir.purpose_objetos',  hint: '' },
    { value: 'mascotas', icon: '🐾', label: 'imprimir.purpose_mascotas', hint: '' },
    { value: 'equipaje', icon: '🧳', label: 'imprimir.purpose_equipaje', hint: '' },
    { value: 'activos',  icon: '🏢', label: 'imprimir.purpose_activos',  hint: '' },
  ];

  /* ── Temas de color ─────────────────────────────────────────── */
  colorThemes: ColorTheme[] = [
    { value: 'clasico', label: 'imprimir.theme_clasico', bg: '#ffffff', text: '#0f172a', accent: '#0052CC', invertQr: false },
    { value: 'azul',    label: 'imprimir.theme_azul',    bg: '#0052CC', text: '#ffffff', accent: '#ffffff', invertQr: true  },
    { value: 'verde',   label: 'imprimir.theme_verde',   bg: '#00B37E', text: '#ffffff', accent: '#ffffff', invertQr: true  },
    { value: 'oscuro',  label: 'imprimir.theme_oscuro',  bg: '#0d1117', text: '#ffffff', accent: '#00B37E', invertQr: true  },
  ];

  /* ── Estado reactivo ────────────────────────────────────────── */
  qrSize      = signal(160);
  colorTheme  = signal('clasico');
  purpose     = signal('medica');
  description = signal('');
  copies      = signal(1);

  copiesArr = computed(() => Array.from({ length: this.copies() }));

  selectedPurpose = computed(() =>
    this.purposeOptions.find(p => p.value === this.purpose()) ?? this.purposeOptions[0]
  );

  selectedTheme = computed(() =>
    this.colorThemes.find(t => t.value === this.colorTheme()) ?? this.colorThemes[0]
  );

  qrFilter = computed(() =>
    this.selectedTheme().invertQr ? 'invert(1) brightness(1.8)' : 'none'
  );

  stickerStyles = computed(() => {
    const t    = this.selectedTheme();
    const size = this.qrSize();
    return {
      'background-color': t.bg,
      'color':            t.text,
      'width':            `${size + 16}px`,
    };
  });

  /* ── Métodos ────────────────────────────────────────────────── */
  onSizeChange(event: Event): void {
    this.qrSize.set(+(event.target as HTMLInputElement).value);
  }

  onDescChange(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onCopiesChange(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.copies.set(Math.min(Math.max(Math.floor(val) || 1, 1), 20));
  }

  print(): void {
    window.print();
  }
}
