import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);

  // Only our own API gets the token. Never send it to other hosts.
  const isApiCall = req.url.startsWith(environment.apiUrl);
  const isCredentialCall =
    req.url.startsWith(`${environment.apiUrl}/auth/login`) ||
    req.url.startsWith(`${environment.apiUrl}/auth/register`);

  const token = auth.token();
  const authReq = token && isApiCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error) => {
      // Expired or invalid token on a protected call: end the session.
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiCall && !isCredentialCall) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};