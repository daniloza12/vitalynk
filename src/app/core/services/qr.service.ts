// ============================================================
//  qr.service.ts — Generación de códigos QR
//  Usa la librería 'qrcode' (pura JS, sin servidor)
// ============================================================
import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {

  /**
   * Genera un QR como base64 PNG data URL.
   * @param text  Contenido a codificar (URL de la ficha pública)
   * @returns     string "data:image/png;base64,…"
   */
  async generate(text: string): Promise<string> {
    return toDataURL(text, {
      width:                 256,
      margin:                2,
      errorCorrectionLevel:  'M',
      color: {
        dark:  '#0052CC', // --color-primary VitaLink
        light: '#FFFFFF',
      },
    });
  }

  /**
   * Construye la URL pública de la ficha de un securityAccount.
   * Usa window.location.origin para ser agnóstico al entorno.
   */
  publicUrl(securityAccount: string): string {
    return `${window.location.origin}/public/${securityAccount}`;
  }
}
