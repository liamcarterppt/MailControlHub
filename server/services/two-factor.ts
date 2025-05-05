import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

// Configure the authenticator
authenticator.options = {
  window: 1, // Allow a time skew of +/- 1 time step
};

/**
 * Generate a new 2FA secret key
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate backup codes for account recovery
 * @param count Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate an 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a 2FA token against a secret
 * @param token The token to verify
 * @param secret The secret key
 * @returns boolean indicating if token is valid
 */
export function verifyToken(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

/**
 * Generate a QR code for 2FA setup
 * @param user The user object containing username and email
 * @param secret The 2FA secret
 * @returns Promise resolving to a data URL containing the QR code image
 */
export async function generateQRCode(
  user: { username: string; email: string },
  secret: string
): Promise<string> {
  const serviceName = 'Mail-in-a-Box SaaS';
  const otpauth = authenticator.keyuri(user.email, serviceName, secret);
  
  // Generate a QR code as a data URL
  return await qrcode.toDataURL(otpauth);
}

/**
 * Verify a backup code
 * @param code The backup code to verify
 * @param storedCodes Array of valid backup codes
 * @returns Object containing whether the code is valid and remaining codes (if used)
 */
export function verifyBackupCode(
  code: string,
  storedCodes: string[]
): { isValid: boolean; remainingCodes: string[] } {
  const normalizedCode = code.trim().toUpperCase();
  
  if (storedCodes.includes(normalizedCode)) {
    // Remove the used code from the array
    const remainingCodes = storedCodes.filter(c => c !== normalizedCode);
    return { isValid: true, remainingCodes };
  }
  
  return { isValid: false, remainingCodes: storedCodes };
}