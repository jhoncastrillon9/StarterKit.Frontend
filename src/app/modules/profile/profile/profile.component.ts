import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MyProfile, ProfileService, UserProfile } from '../services/profile.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  changePasswordForm: FormGroup;

  /** Perfil que viene del backend; es el que trae la fotografia. */
  myProfile: MyProfile | null = null;

  /** Avatar generico mientras el usuario no sube ninguna foto. */
  private readonly defaultAvatar = './assets/img/avatars/3d_1.png';
  private readonly maxPhotoBytes = 2 * 1024 * 1024;

  /** URL local de la foto recien elegida, para que se vea al instante. */
  photoPreview: string | null = null;
  selectedPhoto: File | null = null;
  photoError = '';
  savingPhoto = false;
  
  showChangePasswordModal: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Toggle password visibility
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private profileService: ProfileService,
    private fb: FormBuilder,
    private spinner: NgxSpinnerService
  ) {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.userProfile = this.profileService.getUserProfile();
    // El token no lleva la fotografia, asi que el perfil real se pide al backend.
    this.profileService.getMyProfile().subscribe({
      next: p => { this.myProfile = p; },
      error: () => { /* se sigue mostrando lo que haya en el token */ }
    });
  }

  // ---------- Fotografia ----------

  get avatarSrc(): string {
    return this.photoPreview || this.myProfile?.urlImage || this.defaultAvatar;
  }

  get hasPhoto(): boolean {
    return !!this.myProfile?.urlImage;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;   // el usuario abrio el dialogo y cancelo

    this.photoError = '';

    if (!file.type.startsWith('image/')) {
      input.value = '';
      this.photoError = 'El archivo debe ser una imagen.';
      return;
    }
    if (file.size > this.maxPhotoBytes) {
      input.value = '';
      this.photoError = 'La imagen no puede pesar mas de 2 MB.';
      return;
    }

    this.releasePreview();
    this.selectedPhoto = file;
    this.photoPreview = URL.createObjectURL(file);
  }

  savePhoto(): void {
    if (!this.selectedPhoto) return;
    this.savingPhoto = true;
    this.spinner.show();
    this.profileService.updateMyPhoto(this.selectedPhoto).subscribe({
      next: p => {
        this.myProfile = p;
        this.discardPhoto();
        this.savingPhoto = false;
        this.spinner.hide();
        this.showSuccess('Tu fotografia se actualizo correctamente.');
      },
      error: err => {
        this.savingPhoto = false;
        this.spinner.hide();
        this.photoError = err?.error?.error || err?.error?.message || 'No se pudo subir la fotografia.';
      }
    });
  }

  discardPhoto(): void {
    this.releasePreview();
    this.selectedPhoto = null;
    const input = document.getElementById('photoInput') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  removePhoto(): void {
    this.spinner.show();
    this.profileService.removeMyPhoto().subscribe({
      next: p => {
        this.myProfile = p;
        this.discardPhoto();
        this.spinner.hide();
        this.showSuccess('Se quito tu fotografia.');
      },
      error: () => {
        this.spinner.hide();
        this.photoError = 'No se pudo quitar la fotografia.';
      }
    });
  }

  private releasePreview(): void {
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
      this.photoPreview = null;
    }
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessMessage = true;
    setTimeout(() => { this.showSuccessMessage = false; }, 4000);
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
    this.resetMessages();
    this.changePasswordForm.reset();
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.changePasswordForm.reset();
    this.resetMessages();
  }

  resetMessages(): void {
    this.showSuccessMessage = false;
    this.showErrorMessage = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.spinner.show();
    this.resetMessages();

    const data = {
      currentPassword: this.changePasswordForm.get('currentPassword')?.value,
      newPassword: this.changePasswordForm.get('newPassword')?.value
    };

    this.profileService.changeMyPassword(data).subscribe({
      next: (response) => {
        this.spinner.hide();
        this.showSuccessMessage = true;
        this.successMessage = 'Contraseña actualizada correctamente';
        this.changePasswordForm.reset();
        setTimeout(() => {
          this.closeChangePasswordModal();
        }, 2000);
      },
      error: (error) => {
        this.spinner.hide();
        this.showErrorMessage = true;
        this.errorMessage = error.error?.message || 'Error al cambiar la contraseña. Verifica tu contraseña actual.';
      }
    });
  }

  get f() {
    return this.changePasswordForm.controls;
  }
}
