// ============================================================
//  account-detail.component.ts
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../core/services/account.service';
import { QrService }      from '../../../core/services/qr.service';
import { Account }        from '../../../core/models/account.model';
import { Profile }        from '../../../core/models/profile.model';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private accountService = inject(AccountService);
  private qrService      = inject(QrService);
  private destroyRef     = inject(DestroyRef);

  account  = signal<Account | undefined>(undefined);
  profile  = signal<Profile | null>(null);
  notFound = signal(false);
  loading  = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound.set(true); this.loading.set(false); return; }

    forkJoin({
      account: this.accountService.getById(id),
      profile: this.accountService.getProfileForAccount(id),
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async ({ account, profile }) => {
          this.profile.set(profile);
          // El backend no almacena qrDataUrl — se genera en el frontend
          if (!account.qrDataUrl) {
            account.qrDataUrl = await this.qrService.generate(
              this.qrService.publicUrl(account.securityAccount)
            );
          }
          this.account.set(account);
          this.loading.set(false);
        },
        error: () => { this.notFound.set(true); this.loading.set(false); },
      });
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }

  /** Etiqueta amigable para sexo */
  sexLabel(sex: string | undefined): string {
    const map: Record<string, string> = { M: 'Masculino', F: 'Femenino', OTHER: 'Otro' };
    return sex ? (map[sex] ?? sex) : '—';
  }

  get statusClass(): string {
    const map: Record<string, string> = {
      ACTIVO:     'status--active',
      REGISTRADO: 'status--pending',
      INACTIVO:   'status--inactive',
      SUSPENDIDO: 'status--suspended',
      BLOQUEADO:  'status--blocked',
    };
    return map[this.account()?.status ?? ''] ?? 'status--inactive';
  }

  /** URL pública que codifica el QR */
  get publicUrl(): string {
    const acc = this.account();
    return acc ? this.qrService.publicUrl(acc.securityAccount) : '';
  }

  /** Navega a la ficha pública dentro del SPA */
  openPublicProfile(): void {
    const acc = this.account();
    if (acc) {
      this.router.navigate(['/public', acc.securityAccount]);
    }
  }

  /** Descarga el QR con branding como PNG */
  downloadQr(): void {
    const acc = this.account();
    if (!acc?.qrDataUrl) return;
    this.qrService.downloadWithBranding(acc.qrDataUrl, acc.securityAccount);
  }
}
