// ============================================================
//  account-public.component.ts
//  Vista de emergencia — accesible SIN autenticación.
//  Se accede escaneando el QR de una cuenta VitaLink.
// ============================================================
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap, of, catchError, EMPTY } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AccountService } from '../../../core/services/account.service';
import { Account }        from '../../../core/models/account.model';
import { Profile, PersonalVisibility, ContactVisibility } from '../../../core/models/profile.model';

@Component({
  selector: 'app-account-public',
  standalone: true,
  imports: [],
  templateUrl: './account-public.component.html',
  styleUrl: './account-public.component.scss',
})
export class AccountPublicComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private accountService = inject(AccountService);

  account:     Account | undefined;
  profile:     Profile | null = null;
  notFound     = false;
  rateLimited  = false;

  readonly accessed = new Date();

  ngOnInit(): void {
    const sa = this.route.snapshot.paramMap.get('securityAccount');
    if (!sa) { this.notFound = true; return; }

    this.accountService.getBySecurityAccount(sa).pipe(
      switchMap(account => {
        if (!account) { this.notFound = true; return of(null); }
        this.account = account;
        return this.accountService.getProfileForAccount(account.id);
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 429) { this.rateLimited = true; }
        else { this.notFound = true; }
        return EMPTY;
      })
    ).subscribe(profile => {
      this.profile = profile;
    });
  }

  sexLabel(sex: string | undefined): string {
    const map: Record<string, string> = { M: 'Masculino', F: 'Femenino', OTHER: 'Otro' };
    return sex ? (map[sex] ?? sex) : '—';
  }

  /** Indica si un campo de datos personales es visible en la ficha QR.
   *  Si no hay configuración de visibilidad (perfil antiguo), se muestra por defecto. */
  pVis(field: keyof PersonalVisibility): boolean {
    return this.profile?.visibility?.personal?.[field] ?? true;
  }

  /** Indica si un campo de un contacto de emergencia es visible en la ficha QR. */
  cVis(i: number, field: keyof ContactVisibility): boolean {
    return this.profile?.visibility?.contacts?.[i]?.[field] ?? true;
  }
}
