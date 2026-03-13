// ============================================================
//  auditoria.component.ts — Dashboard de Auditoría (PBI)
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink }    from '@angular/router';
import { DatePipe }      from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { Subject }       from 'rxjs';
import { debounceTime }  from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AuditService }  from '../../../core/services/audit.service';
import { AuditEventType, LoginAuditEntry } from '../../../core/models/audit.model';

// ── Helpers de fecha ──────────────────────────────────────────
function toIsoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function hace7Dias(): string { const d = new Date(); d.setDate(d.getDate() - 7); return toIsoDate(d); }
function hoy(): string { return toIsoDate(new Date()); }
/** Convierte "DD/MM/YYYY HH:mm:ss" → "YYYY-MM-DD" sin ambigüedad de browser */
function createdAtToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
}

// ── Claves de traducción para badges de eventos ───────────────
const EVENT_LABELS: Record<AuditEventType, string> = {
  LOGIN_SUCCESS: 'admin.audit.badge_login_success',
  LOGIN_FAILED:  'admin.audit.badge_login_failed',
  LOGOUT:        'admin.audit.badge_logout',
  REGISTER:      'admin.audit.badge_register',
  TOKEN_EXPIRED: 'admin.audit.badge_token_expired',
};

// ── Interfaces SVG ────────────────────────────────────────────
interface SvgBar      { x: number; y: number; w: number; h: number; count: number }
interface SvgBarGroup { label: string; cx: number; showLbl: boolean; success: SvgBar; failed: SvgBar }
interface SvgGridLine { value: number; y: number }

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [RouterLink, DatePipe, TranslocoModule],
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaComponent implements OnInit {

  private auditService = inject(AuditService);
  private destroyRef   = inject(DestroyRef);

  // ── Período ──────────────────────────────────────────────────
  dateFrom   = signal(hace7Dias());
  dateTo     = signal(hoy());
  lastUpdate = signal<Date>(new Date());

  // ── Filtros locales ──────────────────────────────────────────
  filterEvent = signal<AuditEventType | ''>('');
  private emailSubject = new Subject<string>();
  filterEmail = toSignal(this.emailSubject.pipe(debounceTime(300)), { initialValue: '' });

  // ── Datos ────────────────────────────────────────────────────
  logs    = signal<LoginAuditEntry[]>([]);
  loading = signal(false);

  filtered = computed(() => {
    const ev    = this.filterEvent();
    const email = this.filterEmail().toLowerCase().trim();
    return this.logs().filter(l => {
      const matchEvent = !ev    || l.eventType === ev;
      const matchEmail = !email || l.email.toLowerCase().includes(email);
      return matchEvent && matchEmail;
    });
  });

  // ── Paginación ───────────────────────────────────────────────
  pageSize    = signal(10);
  currentPage = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  pageRange = computed((): (number | null)[] => {
    const total   = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (current > 3) pages.push(null);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  });

  constructor() {
    // Reset a página 1 cuando cambian los filtros
    effect(() => {
      this.filtered();
      untracked(() => this.currentPage.set(1));
    });
  }

  // ── KPIs ─────────────────────────────────────────────────────
  totalPeriodo   = computed(() => this.logs().length);
  exitosos       = computed(() => this.logs().filter(l => l.eventType === 'LOGIN_SUCCESS').length);
  fallos         = computed(() => this.logs().filter(l => l.eventType === 'LOGIN_FAILED').length);
  usuariosUnicos = computed(() => new Set(this.logs().map(l => l.email)).size);

  successRate = computed(() =>
    this.totalPeriodo() > 0 ? Math.round(this.exitosos() / this.totalPeriodo() * 100) : 0
  );
  failureRate = computed(() =>
    this.totalPeriodo() > 0 ? Math.round(this.fallos()   / this.totalPeriodo() * 100) : 0
  );

  // ── Datos por día ────────────────────────────────────────────
  logsPerDay = computed(() => {
    const map = new Map<string, { total: number; success: number; failed: number }>();
    for (const l of this.logs()) {
      const day   = createdAtToIso(l.createdAt);
      const entry = map.get(day) ?? { total: 0, success: 0, failed: 0 };
      entry.total++;
      if (l.eventType === 'LOGIN_SUCCESS')     entry.success++;
      else if (l.eventType === 'LOGIN_FAILED') entry.failed++;
      map.set(day, entry);
    }
    return this.allDatesInRange().map(fecha => ({
      fecha,
      ...(map.get(fecha) ?? { total: 0, success: 0, failed: 0 }),
    }));
  });

  maxPerDay = computed(() => {
    const days = this.logsPerDay();
    return days.length ? Math.max(...days.map(d => Math.max(d.success, d.failed)), 1) : 1;
  });

  private gridTicks = computed(() => {
    const max = this.maxPerDay();
    return Array.from({ length: 5 }, (_, i) => ({
      value: Math.round((max / 4) * i),
      pct:   Math.round((i / 4) * 100),
    }));
  });

  // ── SVG bar chart ────────────────────────────────────────────
  private readonly SVG_LEFT    = 50;
  private readonly SVG_TOP     = 10;
  private readonly SVG_CHART_W = 490;
  private readonly SVG_CHART_H = 120;

  svgGridLines = computed((): SvgGridLine[] =>
    this.gridTicks().map(t => ({
      value: t.value,
      y: this.SVG_TOP + this.SVG_CHART_H * (1 - t.pct / 100),
    }))
  );

  svgBars = computed((): SvgBarGroup[] => {
    const days  = this.logsPerDay();
    const n     = days.length;
    if (!n) return [];

    const maxVal = this.maxPerDay();
    const groupW = this.SVG_CHART_W / n;
    const barW   = Math.max(Math.min(Math.floor(groupW * 0.32), 18), 3);
    const gap    = 2;

    return days.map((day, i) => {
      const cx      = this.SVG_LEFT + (i + 0.5) * groupW;
      const showLbl = n <= 14 || i % Math.ceil(n / 14) === 0;
      const sH      = day.success > 0 ? Math.max((day.success / maxVal) * this.SVG_CHART_H, 4) : 0;
      const fH      = day.failed  > 0 ? Math.max((day.failed  / maxVal) * this.SVG_CHART_H, 4) : 0;

      return {
        label: this.formatDay(day.fecha),
        cx, showLbl,
        success: { x: cx - barW - gap / 2, y: this.SVG_TOP + this.SVG_CHART_H - sH, w: barW, h: sH, count: day.success },
        failed:  { x: cx + gap / 2,        y: this.SVG_TOP + this.SVG_CHART_H - fH, w: barW, h: fH, count: day.failed  },
      };
    });
  });

  // ── Donut: distribución de eventos ───────────────────────────
  private readonly AUDIT_C = 2 * Math.PI * 60;

  eventDistribution = computed(() => {
    const total   = this.totalPeriodo() || 1;
    const success = this.exitosos();
    const failed  = this.fallos();
    const other   = this.totalPeriodo() - success - failed;
    const C       = this.AUDIT_C;

    return {
      realTotal:  this.totalPeriodo(),
      success, failed, other,
      successArc: (success / total) * C,
      failedArc:  (failed  / total) * C,
      otherArc:   (other   / total) * C,
      successPct: Math.round(success / total * 100),
      failedPct:  Math.round(failed  / total * 100),
    };
  });

  // ── Constantes de template ────────────────────────────────────
  readonly eventTypes: Array<{ value: AuditEventType | ''; label: string }> = [
    { value: '',              label: 'admin.audit.filter_all' },
    { value: 'LOGIN_SUCCESS', label: 'admin.audit.filter_login_success' },
    { value: 'LOGIN_FAILED',  label: 'admin.audit.filter_login_failed' },
    { value: 'LOGOUT',        label: 'admin.audit.filter_logout' },
    { value: 'REGISTER',      label: 'admin.audit.filter_register' },
    { value: 'TOKEN_EXPIRED', label: 'admin.audit.filter_token_expired' },
  ];
  readonly eventLabels = EVENT_LABELS;

  // ── Ciclo de vida ─────────────────────────────────────────────
  ngOnInit(): void { this.applyDateFilter(); }

  // ── Acciones ──────────────────────────────────────────────────
  applyDateFilter(): void {
    this.loading.set(true);
    this.auditService.getLogs(this.dateFrom(), this.dateTo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  logs => { this.logs.set(logs); this.loading.set(false); this.lastUpdate.set(new Date()); },
        error: ()   => this.loading.set(false),
      });
  }

  resetToToday(): void {
    this.dateFrom.set(hoy());
    this.dateTo.set(hoy());
    this.filterEvent.set('');
    this.emailSubject.next('');
    this.applyDateFilter();
  }

  onEmailInput(e: Event):    void { this.emailSubject.next((e.target as HTMLInputElement).value); }
  onEventChange(e: Event):   void { this.filterEvent.set((e.target as HTMLSelectElement).value as AuditEventType | ''); }
  onDateFromChange(e: Event): void { this.dateFrom.set((e.target as HTMLInputElement).value); }
  onDateToChange(e: Event):  void { this.dateTo.set((e.target as HTMLInputElement).value); }

  formatDate(s: string): string {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
    return m ? `${m[1]}/${m[2]}/${m[3].slice(2)} ${m[4]}` : s;
  }

  formatDay(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
  }

  eventBadgeClass(type: AuditEventType): string {
    const map: Record<AuditEventType, string> = {
      LOGIN_SUCCESS: 'abadge--success',
      LOGIN_FAILED:  'abadge--danger',
      LOGOUT:        'abadge--neutral',
      REGISTER:      'abadge--info',
      TOKEN_EXPIRED: 'abadge--warning',
    };
    return map[type];
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  onPageSizeChange(e: Event): void {
    this.pageSize.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  private allDatesInRange(): string[] {
    const from = new Date(this.dateFrom() + 'T00:00:00');
    const to   = new Date(this.dateTo()   + 'T00:00:00');
    const dates: string[] = [];
    const cur  = new Date(from);
    while (cur <= to) { dates.push(toIsoDate(cur)); cur.setDate(cur.getDate() + 1); }
    return dates;
  }
}
