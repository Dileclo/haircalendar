/**
 * Format a Russian phone number to standard: +7 (XXX) XXX-XX-XX
 * Handles inputs like:
 *   "89200600061"     → "+7 (920) 060-00-61"
 *   "+79200600061"    → "+7 (920) 060-00-61"
 *   "8 (920) 060-00-61" → "+7 (920) 060-00-61"
 *   "9200600061"      → "+7 (920) 060-00-61" (10 digits, assumes Russian mobile)
 */
export function formatPhone(value: string): string {
  // Strip everything except digits
  let digits = value.replace(/\D/g, '');

  if (digits.length === 0) return '';

  // Normalize: if starts with 8 and 11 digits, replace with 7
  if (digits.length === 11 && digits[0] === '8') {
    digits = '7' + digits.slice(1);
  }
  // If 10 digits (missing country code), assume +7 Russia
  if (digits.length === 10) {
    digits = '7' + digits;
  }

  // If we have 11 digits starting with 7, format nicely
  if (digits.length === 11 && digits[0] === '7') {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }

  // For other lengths, just return as-is with + if it starts with a code
  if (digits.length >= 11 && digits[0] === '7') {
    return '+' + digits;
  }

  // Fallback: return original with non-digits stripped
  return value;
}

/**
 * Format on every keystroke (for controlled inputs).
 * Keeps cursor position reasonably stable by only applying format on blur or when 11 digits reached.
 */
export function formatPhoneLive(value: string): string {
  const digits = value.replace(/\D/g, '');

  // Only format once we have enough digits or on specific patterns
  if (digits.length >= 11) {
    return formatPhone(digits);
  }

  // For partial input, show raw digits with leading +7 if applicable
  if (digits.length > 0) {
    if (digits.startsWith('7') && digits.length <= 11) {
      return '+' + digits;
    }
    if (digits.startsWith('8') && digits.length <= 11) {
      return '+' + digits;
    }
  }

  return value;
}
