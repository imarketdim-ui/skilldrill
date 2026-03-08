/**
 * Format phone number with +7 mask
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove everything except digits
  let digits = value.replace(/\D/g, '');

  // If starts with 8, replace with 7
  if (digits.startsWith('8') && digits.length > 1) {
    digits = '7' + digits.slice(1);
  }

  // Ensure starts with 7
  if (!digits.startsWith('7') && digits.length > 0) {
    digits = '7' + digits;
  }

  // Build formatted string
  if (digits.length === 0) return '';
  if (digits.length <= 1) return '+7';
  if (digits.length <= 4) return `+7 (${digits.slice(1)}`;
  if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Extract raw digits from formatted phone
 */
export const extractPhoneDigits = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

/**
 * Validate phone has 11 digits (7 + 10)
 */
export const isValidPhone = (value: string): boolean => {
  const digits = extractPhoneDigits(value);
  return digits.length === 11 && digits.startsWith('7');
};

/**
 * Validate INN checksum (Russian tax ID)
 * 10 digits for legal entities, 12 for individuals
 */
export const validateINN = (inn: string): { valid: boolean; error?: string } => {
  const digits = inn.replace(/\D/g, '');

  if (digits.length !== 10 && digits.length !== 12) {
    return { valid: false, error: 'ИНН должен содержать 10 или 12 цифр' };
  }

  const n = digits.split('').map(Number);

  if (digits.length === 10) {
    // Checksum for 10-digit INN
    const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum = weights.reduce((acc, w, i) => acc + w * n[i], 0);
    const check = (sum % 11) % 10;
    if (check !== n[9]) {
      return { valid: false, error: 'Неверная контрольная сумма ИНН' };
    }
  } else {
    // Checksum for 12-digit INN (two checks)
    const w1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum1 = w1.reduce((acc, w, i) => acc + w * n[i], 0);
    const check1 = (sum1 % 11) % 10;
    if (check1 !== n[10]) {
      return { valid: false, error: 'Неверная контрольная сумма ИНН (11-я цифра)' };
    }

    const w2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const sum2 = w2.reduce((acc, w, i) => acc + w * n[i], 0);
    const check2 = (sum2 % 11) % 10;
    if (check2 !== n[11]) {
      return { valid: false, error: 'Неверная контрольная сумма ИНН (12-я цифра)' };
    }
  }

  return { valid: true };
};
