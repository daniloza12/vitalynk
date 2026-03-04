// ============================================================
//  account-list.component.ts
// ============================================================
import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe }   from '@angular/common';
import { AccountService } from '../../../core/services/account.service';
import { Account }        from '../../../core/models/account.model';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './account-list.component.html',
  styleUrl: './account-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);

  accounts = signal<Account[]>([]);
  search   = signal('');

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.accounts();
    return this.accounts().filter(
      a => a.email.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.accountService.getAll().subscribe(accounts => {
      this.accounts.set(accounts);
    });
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
