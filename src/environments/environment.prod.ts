export const environment = {
  production: true,
  apiBaseUrl: 'https://aarquitectura.antonioalonso.com.mx',
  requestSecurity: {
    enabled: true,
    mode: 'aes-gcm' as const,
    sharedSecret: 'CHANGE_ME_PROD_SECRET',
    protectQueryParams: true,
    encryptedQueryParamName: 'enc'
  }
};
