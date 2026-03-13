// ============================================================
//  account-public.component.ts
//  Vista de emergencia — accesible SIN autenticación.
//  Se accede escaneando el QR de una cuenta VitaLink.
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { switchMap, of, catchError, EMPTY } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountService } from '../../../core/services/account.service';
import { Account }        from '../../../core/models/account.model';
import { Profile, PersonalVisibility, ContactVisibility } from '../../../core/models/profile.model';

/** Formato esperado del securityAccount: 32 caracteres hexadecimales */
const SA_REGEX = /^[0-9a-f]{32}$/;

@Component({
  selector: 'app-account-public',
  standalone: true,
  imports: [TranslocoModule],
  templateUrl: './account-public.component.html',
  styleUrl: './account-public.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPublicComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private destroyRef     = inject(DestroyRef);
  private transloco      = inject(TranslocoService);

  account    = signal<Account | undefined>(undefined);
  profile    = signal<Profile | null>(null);
  notFound   = signal(false);
  rateLimited = signal(false);
  loading    = signal(true);

  readonly accessed = new Date();

  ngOnInit(): void {
    const sa = this.route.snapshot.paramMap.get('securityAccount');
    // Validar formato antes de llamar al backend
    if (!sa || !SA_REGEX.test(sa)) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.accountService.getBySecurityAccount(sa).pipe(
      switchMap(account => {
        if (!account) { this.notFound.set(true); this.loading.set(false); return of(null); }
        this.account.set(account);
        return this.accountService.getProfileForAccount(account.id);
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 429) { this.rateLimited.set(true); }
        else { this.notFound.set(true); }
        this.loading.set(false);
        return EMPTY;
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(profile => {
      this.profile.set(profile);
      this.loading.set(false);
    });
  }

  sexLabel(sex: string | undefined): string {
    if (!sex) return '—';
    const map: Record<string, string> = {
      M:     this.transloco.translate('public.sex_m'),
      F:     this.transloco.translate('public.sex_f'),
      OTHER: this.transloco.translate('public.sex_other'),
    };
    return map[sex] ?? sex;
  }

  /** Indica si un campo de datos personales es visible en la ficha QR. */
  pVis(field: keyof PersonalVisibility): boolean {
    return this.profile()?.visibility?.personal?.[field] ?? true;
  }

  /** Indica si un campo de un contacto de emergencia es visible en la ficha QR. */
  cVis(i: number, field: keyof ContactVisibility): boolean {
    return this.profile()?.visibility?.contacts?.[i]?.[field] ?? true;
  }
}
