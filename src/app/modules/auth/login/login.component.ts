// ============================================================
//  login.component.ts
// ============================================================
import { Component, inject } from '@angular/core';
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
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading  = false;
  errorMsg = '';
  showPass = false;

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  togglePassword(): void { this.showPass = !this.showPass; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading  = true;
    this.errorMsg = '';

    try {
      const account = await this.auth.login(this.form.getRawValue());
      // Redirige según rol
      this.router.navigate(account.role === 'ADMIN' ? ['/admin'] : ['/perfil']);
    } catch (err: unknown) {
      this.errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}
