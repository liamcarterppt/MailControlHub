import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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
    // Generate a random string that is 10 characters long
    const code = Math.random().toString(36).substring(2, 12).toUpperCase();
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
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
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
  const otpauth = authenticator.keyuri(user.username, serviceName, secret);
  
  try {
    return await QRCode.toDataURL(otpauth);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
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
  const codeIndex = storedCodes.indexOf(normalizedCode);
  
  if (codeIndex === -1) {
    return { isValid: false, remainingCodes: storedCodes };
  }
  
  // Remove the used code
  const remainingCodes = [
    ...storedCodes.slice(0, codeIndex),
    ...storedCodes.slice(codeIndex + 1)
  ];
  
  return { isValid: true, remainingCodes };
}