export function safeAccountDestination(path: unknown): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path) || /^\/(auth|reset-password)([/?#]|$)/.test(path)) return '/account';
  return path;
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters for your password.';
  if (password !== confirmation) return 'Your passwords do not match.';
  return null;
}