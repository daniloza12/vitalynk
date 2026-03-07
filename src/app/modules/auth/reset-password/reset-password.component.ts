// ============================================================
//  reset-password.component.ts
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const pwd     = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private token = '';

  form: FormGroup = this.fb.group(
    {
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  loading     = signal(false);
  success     = signal(false);
  errorMsg    = signal('');
  showPass    = signal(false);
  showConfirm = signal(false);
  tokenValid  = signal(true);

  get newPassword()     { return this.form.get('newPassword')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void  { this.showPass.update(v => !v); }
  toggleConfirm():  void  { this.showConfirm.update(v => !v); }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenValid.set(false);
      this.errorMsg.set('El enlace de recuperación no es válido o ya expiró.');
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading() || !this.tokenValid()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.resetPassword(this.token, this.newPassword.value).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'El enlace expiró o no es válido. Solicita uno nuevo.');
        this.loading.set(false);
      },
    });
  }
}
