// ============================================================
//  account.service.ts — Servicio de Cuentas (HTTP)
//  Endpoints asumidos (Spring Boot):
//    GET  /accounts                         → Account[]
//    GET  /accounts/{id}                    → Account
//    GET  /accounts/security/{secAccount}   → Account
//    PUT  /accounts/{id}                    → Account
//    DELETE /accounts/{id}                  → void
// ============================================================
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { Account } from '../models/account.model';
import { Profile } from '../models/profile.model';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {

  private readonly api = `${environment.apiUrl}/accounts`;

  private http           = inject(HttpClient);
  private profileService = inject(ProfileService);

  // ── Consultas ─────────────────────────────────────────────────

  getAll(): Observable<Account[]> {
    return this.http.get<Account[]>(this.api);
  }

  getById(id: string): Observable<Account> {
    return this.http.get<Account>(`${this.api}/${id}`);
  }

  getBySecurityAccount(securityAccount: string): Observable<Account | null> {
    return this.http.get<Account>(`${this.api}/security/${securityAccount}`).pipe(
      catchError(() => of(null))
    );
  }

  // ── Modificaciones ────────────────────────────────────────────

  update(id: string, data: Partial<Account>): Observable<Account> {
    return this.http.put<Account>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // ── Perfil asociado ───────────────────────────────────────────

  getProfileForAccount(accountId: string): Observable<Profile | null> {
    return this.profileService.getByAccountId(accountId);
  }
}
