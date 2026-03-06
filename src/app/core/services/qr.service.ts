// ============================================================
//  qr.service.ts — Generación de códigos QR
//  Usa la librería 'qrcode' (pura JS, sin servidor)
// ============================================================
import { Injectable } from '@angular/core';
import { toDataURL } from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {

  private cache = new Map<string, string>();

  /**
   * Genera un QR como base64 PNG data URL.
   * Cachea el resultado para no regenerar el mismo QR.
   */
  async generate(text: string): Promise<string> {
    if (this.cache.has(text)) return this.cache.get(text)!;
    const dataUrl = await toDataURL(text, {
      width:                 256,
      margin:                2,
      errorCorrectionLevel:  'M',
      color: {
        dark:  '#0052CC', // --color-primary VitaLink
        light: '#FFFFFF',
      },
    });
    this.cache.set(text, dataUrl);
    return dataUrl;
  }

  /**
   * Construye la URL pública de la ficha de un securityAccount.
   */
  publicUrl(securityAccount: string): string {
    return `${window.location.origin}/public/${securityAccount}`;
  }

  /**
   * Descarga el QR con branding VitaLink como imagen PNG.
   * Centraliza la lógica duplicada de perfil y account-detail.
   */
  downloadWithBranding(qrDataUrl: string, securityAccount: string): void {
    const sa      = securityAccount;
    const msg     = 'En caso de pérdida o emergencia, escanee el QR para visualizar los datos de la persona y sus datos de emergencia';
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d')!;
    const qrSize  = 220;
    const padH    = 20;
    const padV    = 16;
    const headerH = 36;

    canvas.width  = qrSize + padH * 2;
    canvas.height = headerH + padV + qrSize + padV + 22 + 10 + 52 + padV;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0052CC';
    ctx.fillRect(0, 0, canvas.width, headerH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VitaLink', canvas.width / 2, headerH - 10);

    const img    = new Image();
    img.onload   = () => {
      const x = padH;
      const y = headerH + padV;

      ctx.drawImage(img, x, y, qrSize, qrSize);

      ctx.fillStyle = '#0D1B2A';
      ctx.font      = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sa, canvas.width / 2, y + qrSize + 18);

      ctx.fillStyle = '#4A5568';
      ctx.font      = '10px Arial, sans-serif';
      const words   = msg.split(' ');
      const maxW    = canvas.width - padH * 2;
      let   line    = '';
      let   lineY   = y + qrSize + 36;

      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line.trim(), canvas.width / 2, lineY);
          line  = word + ' ';
          lineY += 13;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line.trim(), canvas.width / 2, lineY);

      const link    = document.createElement('a');
      link.href     = canvas.toDataURL('image/png');
      link.download = `vitalink-qr-${sa.substring(0, 8)}.png`;
      link.click();
    };
    img.src = qrDataUrl;
  }
}
