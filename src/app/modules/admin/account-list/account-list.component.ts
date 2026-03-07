// ============================================================
//  account-list.component.ts — Dashboard Administrativo
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  computed,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { Subject }    from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../core/services/account.service';
import { Account, AccountStatus, ACCOUNT_STATUSES } from '../../../core/models/account.model';

/** Convierte "DD/MM/YYYY HH:mm:ss" → "YYYY-MM-DD" sin ambigüedad de browser */
function createdAtToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
}
/** Genera "YYYY-MM-DD" desde un objeto Date usando hora local */
function localIso(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function toIsoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function hace30Dias(): string { const d = new Date(); d.setDate(d.getDate() - 30); return toIsoDate(d); }
function hoy(): string { return toIsoDate(new Date()); }

export interface BarData {
  label:     string;
  count:     number;
  x:         number;
  width:     number;
  barHeight: number;
  barY:      number;
}

export interface GridLine {
  value: number;
  y:     number;
}

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [RouterLink, DatePipe, LowerCasePipe],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  private destroyRef     = inject(DestroyRef);

  accounts   = signal<Account[]>([]);
  loading    = signal(false);
  lastUpdate = signal<Date>(new Date());

  private searchSubject = new Subject<string>();
  search = toSignal(this.searchSubject.pipe(debounceTime(300)), { initialValue: '' });

  dateFrom = signal(hace30Dias());
  dateTo   = signal(hoy());

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.accounts();
    return this.accounts().filter(
      a => a.email.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  });

  pageSize      = signal(10);
  currentPage   = signal(1);
  totalPages    = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  pagedAccounts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  pageRange = computed((): (number | null)[] => {
    const total = this.totalPages(), current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (current > 3) pages.push(null);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  });

  // ── KPIs ────────────────────────────────────────────────────
  totalAccounts = computed(() => this.accounts().length);
  adminCount    = computed(() => this.accounts().filter(a => a.role === 'ADMIN').length);
  userCount     = computed(() => this.accounts().filter(a => a.role === 'USER').length);

  recentCount = computed(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return this.accounts().filter(a => new Date(a.createdAt) >= cutoff).length;
  });

  adminPct = computed(() =>
    this.totalAccounts() > 0
      ? Math.round(this.adminCount() / this.totalAccounts() * 100)
      : 0
  );

  userPct = computed(() =>
    this.totalAccounts() > 0
      ? Math.round(this.userCount() / this.totalAccounts() * 100)
      : 0
  );

  // ── Bar chart: registros por día (últimos 7 días) ────────────
  private readonly CHART_LEFT    = 50;
  private readonly CHART_TOP     = 10;
  private readonly CHART_INNER_W = 450;
  private readonly CHART_INNER_H = 120;
  private readonly BAR_W         = 36;

  private rawBarData = computed(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const counts = new Map<string, number>();
    this.accounts().forEach(a => {
      const key = createdAtToIso(a.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return days.map(d => ({
      label: d.toLocaleDateString('es-ES', { month: 'short', day: '2-digit' }),
      count: counts.get(localIso(d)) ?? 0,
    }));
  });

  barChartData = computed((): BarData[] => {
    const data     = this.rawBarData();
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const groupW   = this.CHART_INNER_W / 7;
    return data.map((d, i) => {
      const barH  = (d.count / maxCount) * this.CHART_INNER_H;
      const safeH = d.count > 0 ? Math.max(barH, 4) : 0;
      return {
        label:     d.label,
        count:     d.count,
        x:         this.CHART_LEFT + i * groupW + (groupW - this.BAR_W) / 2,
        width:     this.BAR_W,
        barHeight: safeH,
        barY:      this.CHART_TOP + this.CHART_INNER_H - safeH,
      };
    });
  });

  yAxisLabels = computed((): GridLine[] => {
    const data     = this.rawBarData();
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return [0, 1, 2, 3].map(i => ({
      value: Math.round((maxCount * i) / 3),
      y:     this.CHART_TOP + this.CHART_INNER_H - (this.CHART_INNER_H * i) / 3,
    }));
  });

  // ── Donut chart: distribución de roles ──────────────────────
  private readonly DONUT_R             = 60;
  readonly         DONUT_CIRCUMFERENCE = 2 * Math.PI * 60; // ~376.99

  donutData = computed(() => {
    const admins   = this.adminCount();
    const users    = this.userCount();
    const denom    = admins + users || 1;
    const adminArc = (admins / denom) * this.DONUT_CIRCUMFERENCE;
    const userArc  = (users  / denom) * this.DONUT_CIRCUMFERENCE;
    return { admins, users, total: admins + users, adminArc, userArc };
  });

  // ── Actividad reciente ───────────────────────────────────────
  recentAccounts = computed(() =>
    [...this.accounts()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  constructor() {
    effect(() => { this.filtered(); untracked(() => this.currentPage.set(1)); });
  }

  ngOnInit(): void { this.applyDateFilter(); }

  applyDateFilter(): void {
    this.loading.set(true);
    this.accountService.getAll(this.dateFrom(), this.dateTo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  accounts => { this.accounts.set(accounts); this.loading.set(false); this.lastUpdate.set(new Date()); },
        error: ()       => this.loading.set(false),
      });
  }

  onSearch(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onDateFromChange(e: Event): void { this.dateFrom.set((e.target as HTMLInputElement).value); }
  onDateToChange(e: Event):   void { this.dateTo.set((e.target as HTMLInputElement).value); }
  resetToToday(): void { this.dateFrom.set(hoy()); this.dateTo.set(hoy()); this.applyDateFilter(); }
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page); }
  onPageSizeChange(e: Event): void { this.pageSize.set(+(e.target as HTMLSelectElement).value); this.currentPage.set(1); }

  // ── Modal de cambio de estado ────────────────────────────────
  readonly statusOptions = ACCOUNT_STATUSES;

  modalOpen            = signal(false);
  modalAccount         = signal<Account | null>(null);
  modalSelectedStatus  = signal<AccountStatus>('REGISTRADO');
  modalLoading         = signal(false);
  modalError           = signal('');

  openStatusModal(account: Account): void {
    this.modalAccount.set(account);
    this.modalSelectedStatus.set(account.status);
    this.modalError.set('');
    this.modalOpen.set(true);
  }

  closeStatusModal(): void {
    if (this.modalLoading()) return;
    this.modalOpen.set(false);
    this.modalAccount.set(null);
  }

  onModalStatusChange(e: Event): void {
    this.modalSelectedStatus.set((e.target as HTMLSelectElement).value as AccountStatus);
  }

  confirmStatusChange(): void {
    const account = this.modalAccount();
    const newStatus = this.modalSelectedStatus();
    if (!account || newStatus === account.status) return;

    this.modalLoading.set(true);
    this.modalError.set('');

    this.accountService.updateStatus(account.id, newStatus)
      .subscribe({
        next: (updated) => {
          this.accounts.update(list =>
            list.map(a => a.id === updated.id ? updated : a)
          );
          this.modalLoading.set(false);
          this.modalOpen.set(false);
          this.modalAccount.set(null);
        },
        error: () => {
          this.modalError.set('No se pudo actualizar el estado. Intente nuevamente.');
          this.modalLoading.set(false);
        },
      });
  }

  trackByLabel(_: number, d: BarData):   string { return d.label; }
  trackByY    (_: number, g: GridLine):  number { return g.y; }
  trackById   (_: number, a: Account):   string { return a.id; }
}
