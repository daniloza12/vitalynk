// ============================================================
//  profile.service.ts — Servicio de Perfiles (HTTP)
//  Endpoints asumidos (Spring Boot):
//    GET  /profiles/{accountId}   → Profile
//    POST /profiles               → Profile  (crear)
//    PUT  /profiles/{accountId}   → Profile  (actualizar)
// ============================================================
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Profile } from '../models/profile.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private readonly api = `${environment.apiUrl}/profiles`;

  private http = inject(HttpClient);

  // ── Consulta ──────────────────────────────────────────────────

  getByAccountId(accountId: string): Observable<Profile | null> {
    return this.http.get<Profile>(`${this.api}/${accountId}`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 429) return throwError(() => err);
        return of(null);
      })
    );
  }

  // ── Guardar (crea si no existe, actualiza si existe) ──────────

  save(profile: Profile): Observable<Profile> {
    return this.http.put<Profile>(`${this.api}/${profile.accountId}`, profile);
  }

  create(profile: Profile): Observable<Profile> {
    return this.http.post<Profile>(this.api, profile);
  }
}
