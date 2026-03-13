// ============================================================
//  forgot-password.component.ts
// ============================================================
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { TurnstileComponent } from '../../../shared/turnstile/turnstile.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, TurnstileComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  @ViewChild(TurnstileComponent) turnstile!: TurnstileComponent;

  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading  = signal(false);
  sent     = signal(false);
  errorMsg = signal('');
  cfToken  = signal('');

  get email() { return this.form.get('email')!; }

  onTurnstileResolved(token: string): void { this.cfToken.set(token); }
  onTurnstileError():            void { this.cfToken.set(''); }

  onSubmit(): void {
    if (this.form.invalid || this.loading() || !this.cfToken()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.forgotPassword(this.email.value.trim().toLowerCase(), this.cfToken()).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: () => {
        // Mensaje genérico — no revela si el correo existe
        this.sent.set(true);
        this.loading.set(false);
      },
    });
  }
}
