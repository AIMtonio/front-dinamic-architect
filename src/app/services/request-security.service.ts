import { Injectable } from '@angular/core';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface EncryptedBodyEnvelope {
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequestSecurityService {
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  async sha256(value: unknown): Promise<string> {
    const normalized = this.normalizeForHash(value);
    const encoded = this.textEncoder.encode(normalized);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return this.toHex(digest);
  }

  async encryptBody(value: unknown, sharedSecret: string): Promise<EncryptedBodyEnvelope> {
    if (!sharedSecret?.trim()) {
      throw new Error('No se encontro sharedSecret para cifrar el body.');
    }

    const plaintext = this.normalizeForHash(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.importAesKeyFromSecret(sharedSecret);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      this.textEncoder.encode(plaintext)
    );

    const packed = this.packIvAndCiphertext(iv, new Uint8Array(encrypted));

    return {
      data: this.toBase64(packed.buffer)
    };
  }

  async decryptBody(encryptedData: string, sharedSecret: string): Promise<string> {
    if (!sharedSecret?.trim()) {
      throw new Error('No se encontro sharedSecret para descifrar el body.');
    }

    const packed = this.fromBase64(encryptedData);
    if (packed.length <= 12) {
      throw new Error('Payload cifrado invalido.');
    }

    const iv = packed.slice(0, 12);
    const ciphertext = packed.slice(12);
    const key = await this.importAesKeyFromSecret(sharedSecret, ['decrypt']);
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );

    return this.textDecoder.decode(decryptedBuffer);
  }

  isBodyEncryptable(body: unknown): body is JsonValue {
    if (body === null || body === undefined) {
      return false;
    }

    if (
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    ) {
      return false;
    }

    return true;
  }

  private async importAesKeyFromSecret(
    secret: string,
    keyUsages: KeyUsage[] = ['encrypt']
  ): Promise<CryptoKey> {
    const digest = await crypto.subtle.digest('SHA-256', this.textEncoder.encode(secret));
    return crypto.subtle.importKey(
      'raw',
      digest,
      { name: 'AES-GCM' },
      false,
      keyUsages
    );
  }

  private normalizeForHash(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value ?? {});
  }

  private toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  private packIvAndCiphertext(iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    const packed = new Uint8Array(iv.length + ciphertext.length);
    packed.set(iv, 0);
    packed.set(ciphertext, iv.length);
    return packed;
  }
}
