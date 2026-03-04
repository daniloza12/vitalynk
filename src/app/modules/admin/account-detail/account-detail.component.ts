// ============================================================
//  account-detail.component.ts
// ============================================================
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { switchMap } from 'rxjs';
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
})
export class AccountDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private accountService = inject(AccountService);
  private qrService      = inject(QrService);

  account: Account | undefined;
  profile: Profile | null = null;
  notFound = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound = true; return; }

    this.accountService.getById(id).pipe(
      switchMap(account => {
        this.account = account;
        return this.accountService.getProfileForAccount(account.id);
      })
    ).subscribe({
      next: async profile => {
        this.profile = profile;
        // El backend no almacena qrDataUrl — se genera en el frontend
        if (this.account && !this.account.qrDataUrl) {
          this.account.qrDataUrl = await this.qrService.generate(
            this.qrService.publicUrl(this.account.securityAccount)
          );
        }
      },
      error: () => { this.notFound = true; },
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

  /** URL pública que codifica el QR */
  get publicUrl(): string {
    return this.account ? this.qrService.publicUrl(this.account.securityAccount) : '';
  }

  /** Navega a la ficha pública dentro del SPA */
  openPublicProfile(): void {
    if (this.account) {
      this.router.navigate(['/public', this.account.securityAccount]);
    }
  }

  /** Descarga el QR como PNG */
  downloadQr(): void {
    if (!this.account?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href     = this.account.qrDataUrl;
    link.download = `vitalink-qr-${this.account.securityAccount.substring(0, 8)}.png`;
    link.click();
  }
}
