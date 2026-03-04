// ============================================================
//  perfil.component.ts — Formulario de perfil con visibilidad QR
// ============================================================
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router }         from '@angular/router';
import { AuthService }    from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { QrService }      from '../../../core/services/qr.service';
import {
  Profile,
  DEFAULT_PERSONAL_VISIBILITY,
  DEFAULT_CONTACT_VISIBILITY,
} from '../../../core/models/profile.model';
import { Account } from '../../../core/models/account.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private auth           = inject(AuthService);
  private profileService = inject(ProfileService);
  private qrService      = inject(QrService);
  private router         = inject(Router);

  account: Account | null = null;

  form!: FormGroup;
  saving   = false;
  saved    = false;
  errorMsg = '';
  confirmDeleteIndex: number | null = null;

  // ── Inicialización ───────────────────────────────────────────
  ngOnInit(): void {
    this.account = this.auth.currentUser();
    this.buildForm();
    this.loadProfile();
  }

  get publicUrl(): string {
    return this.account ? this.qrService.publicUrl(this.account.securityAccount) : '';
  }

  openPublicProfile(): void {
    if (this.account) {
      this.router.navigate(['/public', this.account.securityAccount]);
    }
  }

  closeModal(): void {
    this.saved = false;
  }

  downloadQr(): void {
    if (!this.account?.qrDataUrl) return;
    const sa  = this.account.securityAccount;
    const msg = 'En caso de pérdida o emergencia, escanee el QR para visualizar los datos de la persona y sus datos de emergencia';

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
    img.src = this.account.qrDataUrl;
  }

  private buildForm(): void {
    this.form = this.fb.group({
      personal: this.fb.group({
        sex:           ['',  Validators.required],
        birthDate:     ['',  Validators.required],
        fullName:      ['',  [Validators.required, Validators.minLength(3)]],
        phone:         ['',  Validators.required],
        personalEmail: ['',  Validators.email],
        workEmail:     ['',  Validators.email],
        city:          ['',  Validators.required],
        district:      ['',  Validators.required],
      }),
      medical: this.fb.group({
        diseases:  [''],
        allergies: [''],
        others:    [''],
      }),
      contacts:    this.fb.array([]),
      visPersonal: this.fb.group({
        sex:           [true],
        birthDate:     [true],
        fullName:      [true],
        phone:         [true],
        personalEmail: [true],
        workEmail:     [true],
        city:          [true],
        district:      [true],
      }),
      visContacts: this.fb.array([]),
    });
  }

  private loadProfile(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.profileService.getByAccountId(user.id).subscribe(profile => {
      if (!profile) return;

      this.form.patchValue({
        personal: profile.personal,
        medical:  profile.medical,
      });

      const visPersonal = profile.visibility?.personal ?? DEFAULT_PERSONAL_VISIBILITY;
      this.visPersonal.patchValue(visPersonal);

      const visContacts = profile.visibility?.contacts ?? [];
      profile.contacts.forEach((c: { fullName: string; phone: string; personalEmail: string; workEmail: string }, i: number) => {
        const vis = visContacts[i] ?? { ...DEFAULT_CONTACT_VISIBILITY };
        this.contacts.push(this.newContact(c));
        this.visContacts.push(this.newContactVis(vis));
      });
    });
  }

  // ── Accesores del form ───────────────────────────────────────
  get personal():    FormGroup { return this.form.get('personal')    as FormGroup; }
  get medical():     FormGroup { return this.form.get('medical')     as FormGroup; }
  get contacts():    FormArray { return this.form.get('contacts')    as FormArray; }
  get visPersonal(): FormGroup { return this.form.get('visPersonal') as FormGroup; }
  get visContacts(): FormArray { return this.form.get('visContacts') as FormArray; }

  getContactGroup(i: number): FormGroup {
    return this.contacts.at(i) as FormGroup;
  }

  /** Retorna el FormControl de visibilidad personal para usar con [formControl] */
  visPersonalCtrl(name: string): FormControl {
    return this.visPersonal.get(name) as FormControl;
  }

  /** Retorna el FormControl de visibilidad de un contacto para usar con [formControl] */
  visContactCtrl(i: number, name: string): FormControl {
    return (this.visContacts.at(i) as FormGroup).get(name) as FormControl;
  }

  fieldOf(group: AbstractControl, name: string): AbstractControl {
    return (group as FormGroup).get(name)!;
  }

  // ── Contactos ────────────────────────────────────────────────
  private newContact(value?: Partial<{ fullName: string; phone: string; personalEmail: string; workEmail: string }>): FormGroup {
    return this.fb.group({
      fullName:      [value?.fullName      ?? '', Validators.required],
      phone:         [value?.phone         ?? '', Validators.required],
      personalEmail: [value?.personalEmail ?? '', Validators.email],
      workEmail:     [value?.workEmail     ?? '', Validators.email],
    });
  }

  private newContactVis(value?: Partial<{ fullName: boolean; phone: boolean; personalEmail: boolean; workEmail: boolean }>): FormGroup {
    return this.fb.group({
      fullName:      [value?.fullName      ?? true],
      phone:         [value?.phone         ?? true],
      personalEmail: [value?.personalEmail ?? true],
      workEmail:     [value?.workEmail     ?? true],
    });
  }

  addContact(): void {
    this.contacts.push(this.newContact());
    this.visContacts.push(this.newContactVis());
  }

  requestDeleteContact(i: number): void {
    this.confirmDeleteIndex = i;
  }

  confirmDeleteContact(): void {
    if (this.confirmDeleteIndex !== null) {
      this.contacts.removeAt(this.confirmDeleteIndex);
      this.visContacts.removeAt(this.confirmDeleteIndex);
      this.confirmDeleteIndex = null;
    }
  }

  cancelDeleteContact(): void {
    this.confirmDeleteIndex = null;
  }

  removeContact(i: number): void {
    this.contacts.removeAt(i);
    this.visContacts.removeAt(i);
  }

  // ── Submit ───────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving   = true;
    this.errorMsg = '';
    this.saved    = false;

    const user = this.auth.currentUser()!;
    const raw  = this.form.getRawValue();

    const profile: Profile = {
      accountId: user.id,
      personal:  raw.personal,
      medical:   raw.medical,
      contacts:  raw.contacts,
      visibility: {
        personal: raw.visPersonal,
        contacts: raw.visContacts,
      },
    };

    this.profileService.save(profile).subscribe({
      next:  () => { this.saved = true;  this.saving = false; },
      error: () => { this.errorMsg = 'Error al guardar el perfil.'; this.saving = false; },
    });
  }
}
