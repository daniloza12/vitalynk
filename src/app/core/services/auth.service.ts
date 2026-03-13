// ============================================================
//  auth.service.ts — Servicio de Autenticación (HTTP)
//  Endpoints asumidos (Spring Boot):
//    POST /auth/register  { email, password } → Account
//    POST /auth/login     { email, password } → Account
// ============================================================
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { Account, AuthResponse, LoginDTO, RegisterDTO } from '../models/account.model';
import { QrService } from './qr.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly CURRENT_KEY = 'vl_current_user';
  private readonly JWT_KEY     = 'vl_jwt_token';
  private readonly api         = `${environment.apiUrl}/auth`;

  private http      = inject(HttpClient);
  private qrService = inject(QrService);

  /** Signal reactivo del usuario actual */
  currentUser = signal<Account | null>(this.loadCurrentUser());

  // ── Registro ────────────────────────────────────────────────
  async register(dto: RegisterDTO): Promise<Account> {
    // cfToken se incluye solo cuando el backend ya implementó la verificación Turnstile
    const payload = {
      email:    dto.email.toLowerCase().trim(),
      password: dto.password,
      ...(dto.cfToken ? { cfToken: dto.cfToken } : {}),
    };
    const account = await firstValueFrom(
      this.http.post<Account>(`${this.api}/register`, payload)
    );
    // No se guarda sesión — el usuario debe activar su cuenta primero
    return account;
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDTO): Promise<Account> {
    // cfToken se incluye solo cuando el backend ya implementó la verificación Turnstile
    const payload = {
      email:    dto.email.toLowerCase().trim(),
      password: dto.password,
      ...(dto.cfToken ? { cfToken: dto.cfToken } : {}),
    };
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.api}/login`, payload)
    );

    try { localStorage.setItem(this.JWT_KEY, response.token); } catch { /* ignorar */ }
    const account = response.account;
    this.setCurrentUser(account);
    // QR se genera en segundo plano — no bloquea la navegación
    if (!account.qrDataUrl) {
      this.generateAndCacheQr(account);
    }
    return account;
  }

  // ── Logout ───────────────────────────────────────────────────
  logout(): void {
    try {
      localStorage.removeItem(this.CURRENT_KEY);
      localStorage.removeItem(this.JWT_KEY);
    } catch { /* ignorar */ }
    this.currentUser.set(null);
  }

  // ── Token ────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(this.JWT_KEY);
  }

  // ── Estado ───────────────────────────────────────────────────
  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }

  // ── Privados ─────────────────────────────────────────────────

  /** Genera el QR en segundo plano y actualiza el usuario en localStorage */
  private generateAndCacheQr(account: Account): void {
    this.qrService.generate(this.qrService.publicUrl(account.securityAccount))
      .then(qrDataUrl => {
        account.qrDataUrl = qrDataUrl;
        this.setCurrentUser(account);
      })
      .catch(() => { /* Fallo de QR no es crítico */ });
  }

  private setCurrentUser(account: Account): void {
    try {
      localStorage.setItem(this.CURRENT_KEY, JSON.stringify(account));
    } catch { /* localStorage no disponible */ }
    this.currentUser.set(account);
  }

  private loadCurrentUser(): Account | null {
    try {
      const raw = localStorage.getItem(this.CURRENT_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw) as unknown;
      return this.isValidAccount(obj) ? obj : null;
    } catch {
      return null;
    }
  }

  // ── Recuperación de contraseña ──────────────────────────────
  forgotPassword(email: string, cfToken?: string): Observable<{ message: string }> {
    let params = new HttpParams().set('email', email);
    if (cfToken) params = params.set('cfToken', cfToken);
    return this.http.post<{ message: string }>(`${this.api}/forgot-password`, null, { params });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    const params = new HttpParams().set('token', token);
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, { newPassword }, { params });
  }

  // ── Activación ──────────────────────────────────────────────
  activateAccount(token: string): Observable<{ message: string }> {
    const params = new HttpParams().set('token', token);
    return this.http.get<{ message: string }>(`${this.api}/activate`, { params });
  }

  resendActivationEmail(email: string, cfToken?: string): Observable<{ message: string }> {
    let params = new HttpParams().set('email', email);
    if (cfToken) params = params.set('cfToken', cfToken);
    return this.http.post<{ message: string }>(`${this.api}/resend-activation`, null, { params });
  }

  /** Valida que el objeto cargado de localStorage tiene estructura Account válida.
   *  Previene elevación de privilegios USER → ADMIN editando localStorage. */
  private isValidAccount(obj: unknown): obj is Account {
    if (!obj || typeof obj !== 'object') return false;
    const a = obj as Record<string, unknown>;
    return (
      typeof a['id'] === 'string' &&
      typeof a['email'] === 'string' &&
      (a['role'] === 'ADMIN' || a['role'] === 'USER') &&
      typeof a['securityAccount'] === 'string' &&
      /^[0-9a-f]{32}$/.test(a['securityAccount'] as string)
    );
  }
}
