// ============================================================
//  register.component.ts
// ============================================================
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
})
export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group(
    {
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  loading  = false;
  errorMsg = '';
  showPass = false;
  showConfirm = false;

  get email()           { return this.form.get('email')!; }
  get password()        { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void  { this.showPass    = !this.showPass; }
  toggleConfirm():  void  { this.showConfirm = !this.showConfirm; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    try {
      const account = await this.auth.register(this.form.getRawValue());
      // Primera cuenta = ADMIN → va a /admin, resto → /perfil
      this.router.navigate(account.role === 'ADMIN' ? ['/admin'] : ['/perfil']);
    } catch (err: unknown) {
      this.errorMsg = err instanceof Error ? err.message : 'Error al registrarse.';
    } finally {
      this.loading = false;
    }
  }
}
