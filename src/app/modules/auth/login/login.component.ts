// ============================================================
//  login.component.ts
// ============================================================
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

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

  constructor() {
    if (this.route.snapshot.queryParamMap.get('activated') === 'true') {
      this.activatedBanner.set(true);
    }
  }

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  togglePassword(): void { this.showPass.update(v => !v); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.showResend.set(false);

    try {
      const account = await this.auth.login(this.form.getRawValue());
      this.router.navigate(account.role === 'ADMIN' ? ['/admin'] : ['/perfil']);
    } catch (err: unknown) {
      const httpErr = err as { status?: number; error?: { message?: string } };
      if (httpErr?.status === 401 &&
          httpErr?.error?.message === 'Account is not active') {
        this.errorMsg.set(
          'Tu cuenta no está activa. Revisa tu correo o solicita un nuevo enlace.'
        );
        this.showResend.set(true);
      } else {
        this.errorMsg.set('Correo o contraseña incorrectos.');
      }
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
        this.resendSuccess.set(res.message || 'Email reenviado. Revisa tu bandeja.');
        this.resendLoading.set(false);
      },
      error: () => {
        this.resendError.set('No se pudo reenviar. Verifica el correo ingresado.');
        this.resendLoading.set(false);
      },
    });
  }
}
