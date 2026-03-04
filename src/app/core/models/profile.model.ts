// ============================================================
//  profile.model.ts — Modelo de Perfil VitaLink
// ============================================================

export type Sex = 'M' | 'F' | 'OTHER';

export interface PersonalData {
  sex: Sex | '';
  birthDate: string;
  fullName: string;
  phone: string;
  personalEmail: string;
  workEmail: string;
  city: string;
  district: string;
}

export interface MedicalData {
  diseases: string;
  allergies: string;
  others: string;
}

export interface Contact {
  fullName: string;
  phone: string;
  personalEmail: string;
  workEmail: string;
}

// ── Visibilidad en ficha QR pública ─────────────────────────

export interface PersonalVisibility {
  sex: boolean;
  birthDate: boolean;
  fullName: boolean;
  phone: boolean;
  personalEmail: boolean;
  workEmail: boolean;
  city: boolean;
  district: boolean;
}

export interface ContactVisibility {
  fullName: boolean;
  phone: boolean;
  personalEmail: boolean;
  workEmail: boolean;
}

export interface ProfileVisibility {
  personal: PersonalVisibility;
  contacts: ContactVisibility[];
}

export const DEFAULT_PERSONAL_VISIBILITY: PersonalVisibility = {
  sex: true, birthDate: true, fullName: true, phone: true,
  personalEmail: true, workEmail: true, city: true, district: true,
};

export const DEFAULT_CONTACT_VISIBILITY: ContactVisibility = {
  fullName: true, phone: true, personalEmail: true, workEmail: true,
};

// ── Perfil completo ──────────────────────────────────────────

export interface Profile {
  accountId: string;
  personal: PersonalData;
  medical: MedicalData;
  contacts: Contact[];
  visibility?: ProfileVisibility;   // opcional para compatibilidad con perfiles existentes
}
