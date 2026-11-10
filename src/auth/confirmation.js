// Server responses that mean "prove who you are again" rather than "you are
// not allowed". Everything else must surface as its normal error.
const CONFIRMATION_CODES = ["reauthentication_required", "mfa_required"];

export function isConfirmationError(error) {
  return CONFIRMATION_CODES.includes(error?.code);
}
