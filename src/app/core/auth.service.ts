import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginPayload {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface JwtTokenResponse {
  date?: string;
  access_token: string;
  expires_in: number;
  passwordResetRequired?: boolean;
}

export interface CurrentUser {
  id?: string;
  username?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  libelleProfil?: string;
  activated?: boolean;
  locked?: boolean;
  passwordResetRequired?: boolean;
  roles?: Array<{ id?: string; code?: string; libelle?: string }>;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'reconciliation_access_token';
  private readonly userKey = 'reconciliation_current_user';
  private readonly api = environment.apiBaseUrl;
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  readonly authenticated$ = this.authenticatedSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginPayload): Observable<JwtTokenResponse> {
    return this.http.post<JwtTokenResponse>(`${this.api}/authenticate`, payload).pipe(
      tap((response) => {
        this.setToken(response.access_token);
      })
    );
  }

  loadCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.api}/users/details`).pipe(
      tap((user) => localStorage.setItem(this.userKey, JSON.stringify(user ?? {})))
    );
  }

  register(payload: RegisterPayload): Observable<CurrentUser> {
    return this.http.post<CurrentUser>(`${this.api}/register`, payload);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.authenticatedSubject.next(false);
  }

  token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  currentUser(): CurrentUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }

  authorities(): string[] {
    const token = this.token();
    if (!token) return [];
    const parts = token.split('.');
    if (parts.length < 2) return [];
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const raw = String(payload.auth ?? '');
      return raw.split(',').map((value) => value.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.authenticatedSubject.next(true);
  }

  private hasToken(): boolean {
    return Boolean(localStorage.getItem(this.tokenKey));
  }
}
