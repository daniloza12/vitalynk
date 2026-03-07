// ============================================================
//  account.model.ts — Modelo de Cuenta VitaLink
// ============================================================

export type Role = 'ADMIN' | 'USER';
export type AccountStatus = 'REGISTRADO' | 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'BLOQUEADO';

export const ACCOUNT_STATUSES: AccountStatus[] = ['REGISTRADO', 'ACTIVO', 'INACTIVO', 'SUSPENDIDO', 'BLOQUEADO'];

export interface Account {
  /** Identificador único autogenerado */
  id: string;
  email: string;
  /** Contraseña hasheada con SHA-256 */
  password: string;
  role: Role;
  status: AccountStatus;
  /** Hash SHA-256 truncado a 32 chars, generado al registrarse */
  securityAccount: string;
  /** Imagen QR como base64 PNG data URL, generada al registrarse.
   *  Codifica la URL pública: /public/{securityAccount} */
  qrDataUrl: string;
  createdAt: string; // ISO string para serialización en localStorage
}

export interface RegisterDTO {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}
