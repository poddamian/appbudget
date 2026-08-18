export const formatPln = (value: number): string =>
  `${value.toFixed(2).replace(".", ",")} zł`;

/** Parsuje kwotę wpisaną przez użytkownika (akceptuje przecinek). */
export const parseAmount = (value: string): number => {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") {
    return NaN;
  }
  return Number(trimmed);
};

/** Data w formacie YYYY-MM-DD w strefie lokalnej urządzenia. */
export const localDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
