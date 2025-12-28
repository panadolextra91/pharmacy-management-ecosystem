/**
 * Generate a random 6-digit OTP
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * OTP expiration time (10 minutes)
 */
export function getOtpExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  return expiresAt;
}

