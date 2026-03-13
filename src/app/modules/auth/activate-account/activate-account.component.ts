// ============================================================
//  activate-account.component.ts
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [RouterLink, TranslocoModule],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateAccountComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private authService = inject(AuthService);
  private transloco   = inject(TranslocoService);

  state        = signal<'loading' | 'success' | 'error'>('loading');
  errorMsg     = signal('');

  resendEmail   = signal('');
  resendLoading = signal(false);
  resendSuccess = signal('');
  resendError   = signal('');
  showResend    = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      this.errorMsg.set(this.transloco.translate('auth.activate.error_no_token'));
      this.showResend.set(true);
      return;
    }

    this.authService.activateAccount(token).subscribe({
      next: () => {
        this.state.set('success');
        setTimeout(() => this.router.navigate(['/auth/login'], {
          queryParams: { activated: 'true' },
        }), 2500);
      },
      error: (err) => {
        this.state.set('error');
        this.errorMsg.set(err?.error?.message ?? this.transloco.translate('auth.activate.error_expired'));
        this.showResend.set(true);
      },
    });
  }

  onResendEmailChange(e: Event): void {
    this.resendEmail.set((e.target as HTMLInputElement).value);
  }

  resend(): void {
    const email = this.resendEmail().trim();
    if (!email) return;
    this.resendLoading.set(true);
    this.resendSuccess.set('');
    this.resendError.set('');
    this.authService.resendActivationEmail(email).subscribe({
      next: (res) => {
        this.resendSuccess.set(res.message || this.transloco.translate('auth.activate.resend_success'));
        this.resendLoading.set(false);
      },
      error: () => {
        this.resendError.set(this.transloco.translate('auth.activate.resend_error'));
        this.resendLoading.set(false);
      },
    });
  }
}
