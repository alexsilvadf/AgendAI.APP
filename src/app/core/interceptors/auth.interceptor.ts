import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'agendai_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
