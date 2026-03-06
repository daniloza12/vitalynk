// ============================================================
//  auth.service.ts — Servicio de Autenticación (HTTP)
//  Endpoints asumidos (Spring Boot):
//    POST /auth/register  { email, password } → Account
//    POST /auth/login     { email, password } → Account
// ============================================================
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Account, LoginDTO, RegisterDTO } from '../models/account.model';
import { QrService } from './qr.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly CURRENT_KEY = 'vl_current_user';
  private readonly api         = `${environment.apiUrl}/auth`;

  private http      = inject(HttpClient);
  private qrService = inject(QrService);

  /** Signal reactivo del usuario actual */
  currentUser = signal<Account | null>(this.loadCurrentUser());

  // ── Registro ────────────────────────────────────────────────
  async register(dto: RegisterDTO): Promise<Account> {
    const payload = { email: dto.email.toLowerCase().trim(), password: dto.password };
    const account = await firstValueFrom(
      this.http.post<Account>(`${this.api}/register`, payload)
    );

    this.setCurrentUser(account);
    // QR se genera en segundo plano — no bloquea la navegación
    this.generateAndCacheQr(account);
    return account;
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDTO): Promise<Account> {
    const payload = { email: dto.email.toLowerCase().trim(), password: dto.password };
    const account = await firstValueFrom(
      this.http.post<Account>(`${this.api}/login`, payload)
    );

    this.setCurrentUser(account);
    // QR se genera en segundo plano — no bloquea la navegación
    if (!account.qrDataUrl) {
      this.generateAndCacheQr(account);
    }
    return account;
  }

  // ── Logout ───────────────────────────────────────────────────
  logout(): void {
    try { localStorage.removeItem(this.CURRENT_KEY); } catch { /* ignorar */ }
    this.currentUser.set(null);
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
