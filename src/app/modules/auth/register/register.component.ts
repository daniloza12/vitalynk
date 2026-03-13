// ============================================================
//  register.component.ts
// ============================================================
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { TurnstileComponent } from '../../../shared/turnstile/turnstile.component';

/** Validador: confirmar contraseña coincide con password */
const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const pwd     = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, TurnstileComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  /** Widget del formulario de registro */
  @ViewChild('registerTurnstile') registerTurnstile!: TurnstileComponent;
  /** Widget de la pantalla de reenvío */
  @ViewChild('resendTurnstile')   resendTurnstile!:   TurnstileComponent;

  private fb        = inject(FormBuilder);
  private auth      = inject(AuthService);
  private transloco = inject(TranslocoService);

  form: FormGroup = this.fb.group(
    {
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  loading         = signal(false);
  errorMsg        = signal('');
  showPass        = signal(false);
  showConfirm     = signal(false);
  registeredEmail = signal('');
  resendLoading   = signal(false);
  resendSuccess   = signal('');
  resendError     = signal('');
  /** Token del widget de registro */
  cfToken         = signal('');
  /** Token del widget de reenvío */
  cfTokenResend   = signal('');

  get email()           { return this.form.get('email')!; }
  get password()        { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void  { this.showPass.update(v => !v); }
  toggleConfirm():  void  { this.showConfirm.update(v => !v); }

  onTurnstileResolved(token: string):       void { this.cfToken.set(token); }
  onTurnstileError():                       void { this.cfToken.set(''); }
  onResendTurnstileResolved(token: string): void { this.cfTokenResend.set(token); }
  onResendTurnstileError():                 void { this.cfTokenResend.set(''); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading() || !this.cfToken()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.auth.register({
        ...this.form.getRawValue(),
        cfToken: this.cfToken(),
      });
      this.registeredEmail.set(this.form.get('email')!.value);
    } catch {
      // Mensaje genérico — no revela detalles del error del backend
      this.errorMsg.set(this.transloco.translate('auth.register.error_create'));
      this.cfToken.set('');
      this.registerTurnstile?.reset();
    } finally {
      this.loading.set(false);
    }
  }

  resend(): void {
    const email = this.registeredEmail();
    if (!email || !this.cfTokenResend()) return;

    this.resendLoading.set(true);
    this.resendSuccess.set('');
    this.resendError.set('');

    this.auth.resendActivationEmail(email, this.cfTokenResend()).subscribe({
      next: (res) => {
        this.resendSuccess.set(res.message || this.transloco.translate('auth.register.resend_success'));
        this.resendLoading.set(false);
        // Invalidar token usado
        this.cfTokenResend.set('');
        this.resendTurnstile?.reset();
      },
      error: () => {
        this.resendError.set(this.transloco.translate('auth.register.resend_error'));
        this.resendLoading.set(false);
        this.cfTokenResend.set('');
        this.resendTurnstile?.reset();
      },
    });
  }
}
