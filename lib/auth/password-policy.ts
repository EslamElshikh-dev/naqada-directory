export const PASSWORD_MIN_LENGTH = 10;

const commonPasswords = new Set([
  'password123',
  'password1234',
  'qwerty12345',
  'admin12345',
  'welcome123',
  '123456789a',
]);

export type PasswordStrength = {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  message: string;
  length: boolean;
  letter: boolean;
  number: boolean;
};

export function evaluatePassword(password: string): PasswordStrength {
  const length = password.length >= PASSWORD_MIN_LENGTH;
  const letter = /\p{L}/u.test(password);
  const number = /\p{N}/u.test(password);
  const uncommon = !commonPasswords.has(password.normalize('NFKC').trim().toLowerCase());
  const symbol = /[^\p{L}\p{N}\s]/u.test(password);
  let rawScore = 0;
  if (length) rawScore += 1;
  if (letter && number) rawScore += 1;
  if (password.length >= 12) rawScore += 1;
  if (symbol && uncommon) rawScore += 1;
  const score = Math.min(4, rawScore) as 0 | 1 | 2 | 3 | 4;
  const valid = length && letter && number && uncommon;
  const label = score <= 1 ? 'ضعيفة' : score === 2 ? 'مقبولة' : score === 3 ? 'جيدة' : 'قوية جدًا';
  const message = !length
    ? `استخدم ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`
    : !letter
      ? 'أضف حرفًا واحدًا على الأقل.'
      : !number
        ? 'أضف رقمًا واحدًا على الأقل.'
        : !uncommon
          ? 'اختر كلمة مرور أقل شيوعًا.'
          : 'كلمة المرور تستوفي متطلبات الأمان.';
  return { valid, score, label, message, length, letter, number };
}

export function passwordPolicyError(password: string) {
  const result = evaluatePassword(password);
  return result.valid ? '' : result.message;
}
