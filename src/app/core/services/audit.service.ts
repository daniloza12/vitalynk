// ============================================================
//  audit.service.ts — Servicio de Auditoría (HTTP)
//  Endpoints asumidos (Spring Boot):
//    GET /audit/logins?from=2026-03-01&to=2026-03-06 → LoginAuditEntry[]
// ============================================================
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { LoginAuditEntry } from '../models/audit.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {

  private readonly api = `${environment.apiUrl}/audit`;

  private http = inject(HttpClient);

  getLogs(from: string, to: string): Observable<LoginAuditEntry[]> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.http.get<LoginAuditEntry[]>(`${this.api}/logins`, { params }).pipe(
      catchError(() => of([]))
    );
  }
}
