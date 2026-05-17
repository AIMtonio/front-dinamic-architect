import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpParams,
  HttpResponse,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RequestSecurityService } from '../services/request-security.service';

@Injectable()
export class SecureBodyInterceptor implements HttpInterceptor {
  constructor(private readonly requestSecurityService: RequestSecurityService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const settings = environment.requestSecurity;
    if (!settings?.enabled) {
      return next.handle(req);
    }

    if (!this.shouldProtect(req)) {
      return next.handle(req);
    }

    return from(this.protectRequest(req, settings)).pipe(
      switchMap((securedRequest) =>
        next.handle(securedRequest).pipe(
          mergeMap((event) => from(this.decryptResponseEvent(event, settings, securedRequest.responseType)))
        )
      )
    );
  }

  private shouldProtect(req: HttpRequest<unknown>): boolean {
    return req.url.startsWith(environment.apiBaseUrl);
  }

  private async protectRequest(
    req: HttpRequest<unknown>,
    settings: {
      mode: 'sha256' | 'aes-gcm';
      sharedSecret: string;
      protectQueryParams?: boolean;
      encryptedQueryParamName?: string;
    }
  ): Promise<HttpRequest<unknown>> {
    const hasBody = this.requestSecurityService.isBodyEncryptable(req.body);
    const hasQueryParams = req.params.keys().length > 0;
    let securedReq = req;

    if (hasBody) {
      if (settings.mode === 'sha256') {
        const digest = await this.requestSecurityService.sha256(req.body);
        securedReq = securedReq.clone({
          setHeaders: {
            'X-Body-SHA256': digest
          }
        });
      } else {
        const encryptedBody = await this.requestSecurityService.encryptBody(req.body, settings.sharedSecret);
        securedReq = securedReq.clone({
          body: encryptedBody
        });
      }
    }

    if (hasQueryParams) {
      const queryPayload = this.toQueryPayload(req.params);

      if (settings.mode === 'sha256' || !settings.protectQueryParams) {
        const queryDigest = await this.requestSecurityService.sha256(queryPayload);
        return securedReq.clone({
          setHeaders: {
            'X-Query-SHA256': queryDigest
          }
        });
      }

      const encryptedQuery = await this.requestSecurityService.encryptBody(queryPayload, settings.sharedSecret);
      const encryptedQueryParamName = settings.encryptedQueryParamName ?? 'enc';
      const encryptedQueryValue = encryptedQuery.data;

      return securedReq.clone({
        params: new HttpParams().set(encryptedQueryParamName, encryptedQueryValue)
      });
    }

    return securedReq;
  }

  private toQueryPayload(params: HttpParams): Record<string, string | string[]> {
    const payload: Record<string, string | string[]> = {};

    params.keys().forEach((key) => {
      const values = params.getAll(key) ?? [];
      payload[key] = values.length > 1 ? values : (values[0] ?? '');
    });

    return payload;
  }

  private async decryptResponseEvent(
    event: HttpEvent<unknown>,
    settings: {
      mode: 'sha256' | 'aes-gcm';
      sharedSecret: string;
      protectQueryParams?: boolean;
      encryptedQueryParamName?: string;
    },
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text'
  ): Promise<HttpEvent<unknown>> {
    if (!(event instanceof HttpResponse) || settings.mode !== 'aes-gcm') {
      return event;
    }

    const encryptedData = this.extractEncryptedData(event.body);
    if (!encryptedData) {
      return event;
    }

    try {
      const decryptedText = await this.requestSecurityService.decryptBody(encryptedData, settings.sharedSecret);
      const decryptedBody = this.toExpectedResponseType(decryptedText, responseType);
      return event.clone({ body: decryptedBody });
    } catch {
      // If the payload is not encrypted (or key mismatch), keep original response.
      return event;
    }
  }

  private extractEncryptedData(body: unknown): string | null {
    if (!body) {
      return null;
    }

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return this.isEncryptedEnvelope(parsed) ? parsed.data : null;
      } catch {
        return this.looksLikeEncryptedString(body) ? body.trim() : null;
      }
    }

    return this.isEncryptedEnvelope(body) ? body.data : null;
  }

  private isEncryptedEnvelope(value: unknown): value is { data: string } {
    return typeof value === 'object' &&
      value !== null &&
      'data' in value &&
      typeof (value as { data: unknown }).data === 'string';
  }

  private looksLikeEncryptedString(value: string): boolean {
    const candidate = value.trim();
    if (candidate.length < 24) {
      return false;
    }

    // Base64-like payload (includes URL-safe variants and optional padding).
    return /^[A-Za-z0-9+/=_-]+$/.test(candidate);
  }

  private toExpectedResponseType(
    decryptedText: string,
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text'
  ): unknown {
    if (responseType === 'text') {
      return decryptedText;
    }

    if (responseType === 'json') {
      try {
        return JSON.parse(decryptedText);
      } catch {
        return decryptedText;
      }
    }

    return decryptedText;
  }
}
