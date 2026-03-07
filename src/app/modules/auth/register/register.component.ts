// ============================================================
//  register.component.ts
// ============================================================
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { AuthService } from '../../../core/services/auth.service';

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
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

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

  get email()           { return this.form.get('email')!; }
  get password()        { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void  { this.showPass.update(v => !v); }
  toggleConfirm():  void  { this.showConfirm.update(v => !v); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.auth.register(this.form.getRawValue());
      this.registeredEmail.set(this.form.get('email')!.value);
    } catch {
      // Mensaje genérico — no revela detalles del error del backend
      this.errorMsg.set('No fue posible crear la cuenta. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  resend(): void {
    const email = this.registeredEmail();
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
        this.resendError.set('No se pudo reenviar. Intenta de nuevo.');
        this.resendLoading.set(false);
      },
    });
  }
}
