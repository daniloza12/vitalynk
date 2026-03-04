import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  user    = this.auth.currentUser;
  isAdmin = computed(() => this.user()?.role === 'ADMIN');

  sidebarOpen  = false;
  activeModal  = signal<string | null>(null);

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar():  void { this.sidebarOpen = false; }

  openModal(id: string): void {
    this.activeModal.set(id);
    this.closeSidebar();
  }

  closeModal(): void { this.activeModal.set(null); }

  goToPerfil(): void {
    this.closeModal();
    this.router.navigate(['/perfil']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
