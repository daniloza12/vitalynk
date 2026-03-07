// ============================================================
//  audit.model.ts
// ============================================================

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'TOKEN_EXPIRED';

export interface LoginAuditEntry {
  id:            string;
  accountId:     string | null;
  email:         string;
  eventType:     AuditEventType;
  ipAddress:     string | null;
  userAgent:     string | null;
  failureReason: string | null;
  createdAt:     string; // ISO string
}

export interface AuditFilter {
  from:        string;
  to:          string;
  eventType?:  AuditEventType | '';
  email?:      string;
}
