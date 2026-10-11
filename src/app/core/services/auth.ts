import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginInput, RegisterInput, User } from '../../models/auth.model';
import { isTokenExpired } from '../../shared/utils/jwt';

const TOKEN_KEY = 'awb_token';
const USER_KEY = 'awb_user';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode); session lasts until reload */
  }
}

function readUser(): User | null {
  try {
    const raw = read(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly tokenSignal = signal<string | null>(read(TOKEN_KEY));
  readonly user = signal<User | null>(readUser());

  register(input: RegisterInput): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, input).pipe(tap((res) => this.setSession(res)));
  }

  login(input: LoginInput): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, input).pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Returns the token only if it exists and has not expired. */
  token(): string | null {
    const token = this.tokenSignal();
    if (!token) return null;
    if (isTokenExpired(token)) {
      this.clearSession();
      return null;
    }
    return token;
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  private setSession(res: AuthResponse): void {
    write(TOKEN_KEY, res.token);
    write(USER_KEY, JSON.stringify(res.user));
    this.tokenSignal.set(res.token);
    this.user.set(res.user);
  }

  private clearSession(): void {
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
    this.tokenSignal.set(null);
    this.user.set(null);
  }
}