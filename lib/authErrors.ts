import type { AuthError } from "@supabase/supabase-js";

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "Nieprawidłowy email lub hasło.",
  email_not_confirmed:
    "Adres e-mail nie został potwierdzony. Kliknij link z wiadomości, którą wysłaliśmy.",
  user_already_exists: "Konto z tym adresem e-mail już istnieje.",
  email_exists: "Konto z tym adresem e-mail już istnieje.",
  weak_password: "Hasło jest zbyt słabe. Użyj co najmniej 6 znaków.",
  same_password: "Nowe hasło musi być inne niż obecne.",
  over_request_rate_limit:
    "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.",
  over_email_send_rate_limit:
    "Wysłaliśmy już wiadomość na ten adres. Odczekaj chwilę przed kolejną próbą.",
  signup_disabled: "Rejestracja jest obecnie wyłączona.",
  email_address_invalid: "Podany adres e-mail jest nieprawidłowy.",
  validation_failed: "Podane dane są nieprawidłowe. Sprawdź je i spróbuj ponownie.",
  user_banned: "To konto zostało zablokowane.",
  session_expired: "Sesja wygasła. Zaloguj się ponownie.",
};

export function translateAuthError(error: unknown): string {
  const authError = error as Partial<AuthError> | null;

  const code = authError?.code;
  if (code && MESSAGES_BY_CODE[code]) {
    return MESSAGES_BY_CODE[code];
  }

  const message = authError?.message ?? "";

  if (/invalid login credentials/i.test(message)) {
    return MESSAGES_BY_CODE.invalid_credentials;
  }
  if (/already registered|already exists/i.test(message)) {
    return MESSAGES_BY_CODE.user_already_exists;
  }
  if (/password should be at least/i.test(message)) {
    return MESSAGES_BY_CODE.weak_password;
  }
  if (/email not confirmed/i.test(message)) {
    return MESSAGES_BY_CODE.email_not_confirmed;
  }
  if (/network request failed|failed to fetch|fetch failed/i.test(message)) {
    return "Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.";
  }

  return "Coś poszło nie tak. Spróbuj ponownie za chwilę.";
}
