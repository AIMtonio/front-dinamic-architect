export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  requestSecurity: {
    enabled: true,
    mode: 'aes-gcm' as const,
    sharedSecret: 'CHANGE_ME_DEV_SECRET',
    protectQueryParams: true,
    encryptedQueryParamName: 'enc'
  }
};
