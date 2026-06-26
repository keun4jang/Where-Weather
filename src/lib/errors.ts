export class AppError extends Error {
  /** i18n key describing the error to the user. */
  readonly i18nKey: string;

  constructor(i18nKey: string, message?: string) {
    super(message ?? i18nKey);
    this.name = 'AppError';
    this.i18nKey = i18nKey;
  }
}

export class GeolocationError extends AppError {
  constructor(i18nKey: string, message?: string) {
    super(i18nKey, message);
    this.name = 'GeolocationError';
  }
}

export class ProviderFetchError extends AppError {
  readonly provider: string;

  constructor(provider: string, message?: string) {
    super('errors.providerFailed', message);
    this.name = 'ProviderFetchError';
    this.provider = provider;
  }
}

export function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
