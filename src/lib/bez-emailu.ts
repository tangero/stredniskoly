/**
 * Text pro log bez e-mailových adres (#279): logy odcházejí drainem do BetterStacku, kde osobní adresa
 * nemá co dělat. Adresu nenahrazuje otiskem, protože otisk adresy jde zkoušet slovníkem.
 */
export function bezEmailu(text: string): string {
  return text.replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+\.[^\s@<>"'(),;:]+/g, '[e-mail]');
}
