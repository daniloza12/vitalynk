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

    // El QR se genera en el frontend a partir del securityAccount retornado por el backend
    account.qrDataUrl = await this.qrService.generate(
      this.qrService.publicUrl(account.securityAccount)
    );

    this.setCurrentUser(account);
    return account;
  }

  // ── Login ────────────────────────────────────────────────────
  async login(dto: LoginDTO): Promise<Account> {
    const payload = { email: dto.email.toLowerCase().trim(), password: dto.password };
    const account = await firstValueFrom(
      this.http.post<Account>(`${this.api}/login`, payload)
    );

    // El backend no almacena qrDataUrl — se genera en el frontend
    if (!account.qrDataUrl) {
      account.qrDataUrl = await this.qrService.generate(
        this.qrService.publicUrl(account.securityAccount)
      );
    }

    this.setCurrentUser(account);
    return account;
  }

  // ── Logout ───────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem(this.CURRENT_KEY);
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

  private setCurrentUser(account: Account): void {
    localStorage.setItem(this.CURRENT_KEY, JSON.stringify(account));
    this.currentUser.set(account);
  }

  private loadCurrentUser(): Account | null {
    const raw = localStorage.getItem(this.CURRENT_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  }
}
