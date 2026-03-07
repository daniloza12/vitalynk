// ============================================================
//  perfil.component.ts — Formulario de perfil con visibilidad QR
// ============================================================
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService }    from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { QrService }      from '../../../core/services/qr.service';
import {
  Profile,
  DEFAULT_PERSONAL_VISIBILITY,
  DEFAULT_CONTACT_VISIBILITY,
} from '../../../core/models/profile.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private auth           = inject(AuthService);
  private profileService = inject(ProfileService);
  private qrService      = inject(QrService);
  private router         = inject(Router);
  private destroyRef     = inject(DestroyRef);

  /** Signal reactivo del usuario — se actualiza cuando el QR se genera en segundo plano */
  account = this.auth.currentUser;

  form!: FormGroup;
  saving             = signal(false);
  saved              = signal(false);
  errorMsg           = signal('');
  confirmDeleteIndex = signal<number | null>(null);

  // ── Inicialización ───────────────────────────────────────────
  ngOnInit(): void {
    this.buildForm();
    this.loadProfile();
  }

  get publicUrl(): string {
    const acc = this.account();
    return acc ? this.qrService.publicUrl(acc.securityAccount) : '';
  }

  openPublicProfile(): void {
    const acc = this.account();
    if (acc) {
      this.router.navigate(['/public', acc.securityAccount]);
    }
  }

  closeModal(): void {
    this.saved.set(false);
  }

  downloadQr(): void {
    const acc = this.account();
    if (!acc?.qrDataUrl) return;
    this.qrService.downloadWithBranding(acc.qrDataUrl, acc.securityAccount);
  }

  private buildForm(): void {
    const accountEmail = this.account()?.email ?? '';
    this.form = this.fb.group({
      personal: this.fb.group({
        sex:           ['',  Validators.required],
        birthDate:     ['',  Validators.required],
        fullName:      ['',  [Validators.required, Validators.minLength(3)]],
        phone:         ['',  Validators.required],
        personalEmail: [{ value: accountEmail, disabled: true }, Validators.email],
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
    const user = this.account();
    if (!user) return;

    this.profileService.getByAccountId(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(profile => {
        if (!profile) return;

        this.form.patchValue({
          personal: profile.personal,
          medical:  profile.medical,
        });
        // El correo personal siempre refleja el email de la cuenta — no editable
        this.personal.get('personalEmail')!.setValue(this.account()?.email ?? '');

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
    this.confirmDeleteIndex.set(i);
  }

  confirmDeleteContact(): void {
    const idx = this.confirmDeleteIndex();
    if (idx !== null) {
      this.contacts.removeAt(idx);
      this.visContacts.removeAt(idx);
      this.confirmDeleteIndex.set(null);
    }
  }

  cancelDeleteContact(): void {
    this.confirmDeleteIndex.set(null);
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

    this.saving.set(true);
    this.errorMsg.set('');
    this.saved.set(false);

    const user = this.account()!;
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

    this.profileService.save(profile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => { this.saved.set(true);  this.saving.set(false); },
        error: () => { this.errorMsg.set('Error al guardar el perfil.'); this.saving.set(false); },
      });
  }
}
