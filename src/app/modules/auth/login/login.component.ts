// ============================================================
//  login.component.ts
// ============================================================
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { TurnstileComponent } from '../../../shared/turnstile/turnstile.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, TurnstileComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  @ViewChild(TurnstileComponent) turnstile!: TurnstileComponent;

  private fb        = inject(FormBuilder);
  private auth      = inject(AuthService);
  private router    = inject(Router);
  private route     = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  form: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading         = signal(false);
  errorMsg        = signal('');
  showPass        = signal(false);
  activatedBanner = signal(false);
  showResend      = signal(false);
  resendEmail     = signal('');
  resendLoading   = signal(false);
  resendSuccess   = signal('');
  resendError     = signal('');
  cfToken         = signal('');

  constructor() {
    if (this.route.snapshot.queryParamMap.get('activated') === 'true') {
      this.activatedBanner.set(true);
    }
  }

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  togglePassword(): void { this.showPass.update(v => !v); }

  onTurnstileResolved(token: string): void { this.cfToken.set(token); }
  onTurnstileError():            void { this.cfToken.set(''); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading() || !this.cfToken()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.showResend.set(false);

    try {
      const account = await this.auth.login({
        ...this.form.getRawValue(),
        cfToken: this.cfToken(),
      });
      this.router.navigate(account.role === 'ADMIN' ? ['/admin'] : ['/perfil']);
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { message?: string } };
      if (httpErr?.status === 403) {
        this.errorMsg.set(this.transloco.translate('auth.login.error_inactive'));
        this.showResend.set(true);
      } else {
        this.errorMsg.set(this.transloco.translate('auth.login.error_credentials'));
      }
      // Reiniciar widget tras error para generar un nuevo token
      this.cfToken.set('');
      this.turnstile?.reset();
    } finally {
      this.loading.set(false);
    }
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
    this.auth.resendActivationEmail(email).subscribe({
      next: (res) => {
        this.resendSuccess.set(res.message || this.transloco.translate('auth.login.resend_success'));
        this.resendLoading.set(false);
      },
      error: () => {
        this.resendError.set(this.transloco.translate('auth.login.resend_error'));
        this.resendLoading.set(false);
      },
    });
  }
}
