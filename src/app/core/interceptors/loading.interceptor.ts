import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/** Set on a request to skip the global loader (e.g. background polling). */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

/** Minimum time (ms) the loader stays visible after the request completes. */
export const MIN_LOADER_MS = new HttpContextToken<number>(() => 0);

const LOGIN_MIN_LOADER_MS = 3000;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADER)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  const minMs = req.context.get(MIN_LOADER_MS) || loginMinLoaderMs(req);
  const startedAt = Date.now();

  loading.show();

  return next(req).pipe(
    finalize(() => {
      const remaining = minMs - (Date.now() - startedAt);
      if (remaining > 0) {
        setTimeout(() => loading.hide(), remaining);
        return;
      }
      loading.hide();
    })
  );
};

function loginMinLoaderMs(req: { url: string }): number {
  return req.url.includes('/auth/login') ? LOGIN_MIN_LOADER_MS : 0;
}
