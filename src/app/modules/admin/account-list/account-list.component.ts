// ============================================================
//  account-list.component.ts — Dashboard Administrativo
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe }   from '@angular/common';
import { Subject }    from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../core/services/account.service';
import { Account }        from '../../../core/models/account.model';

/** Convierte "DD/MM/YYYY HH:mm:ss" → "YYYY-MM-DD" sin ambigüedad de browser */
function createdAtToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s.slice(0, 10);
}
/** Genera "YYYY-MM-DD" desde un objeto Date usando hora local */
function localIso(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

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
  imports: [RouterLink, DatePipe],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  private destroyRef     = inject(DestroyRef);

  accounts   = signal<Account[]>([]);
  lastUpdate = signal<Date>(new Date());

  private searchSubject = new Subject<string>();
  search = toSignal(this.searchSubject.pipe(debounceTime(300)), { initialValue: '' });

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.accounts();
    return this.accounts().filter(
      a => a.email.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
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

  ngOnInit(): void {
    this.accountService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(accounts => {
        this.accounts.set(accounts);
        this.lastUpdate.set(new Date());
      });
  }

  onSearch(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  trackByLabel(_: number, d: BarData):   string { return d.label; }
  trackByY    (_: number, g: GridLine):  number { return g.y; }
  trackById   (_: number, a: Account):   string { return a.id; }
}
