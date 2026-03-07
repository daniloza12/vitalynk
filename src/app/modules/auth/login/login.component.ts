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
import { Router, RouterLink } from '@angular/router';
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

  form: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading  = signal(false);
  errorMsg = signal('');
  showPass = signal(false);

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

    try {
      const account = await this.auth.login(this.form.getRawValue());
      this.router.navigate(account.role === 'ADMIN' ? ['/admin'] : ['/perfil']);
    } catch {
      // Mensaje genérico — no revela si el usuario existe
      this.errorMsg.set('Correo o contraseña incorrectos.');
    } finally {
      this.loading.set(false);
    }
  }
}
