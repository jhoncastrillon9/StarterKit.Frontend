/**
 * Validación de formato de correo electrónico compartida por toda la aplicación.
 *
 * Vivía embebida en add-update-customer.component.ts (validateEmail). Ahora también la
 * usa el selector de correos (email-selector-modal), que permite escribir destinatarios
 * nuevos: las dos pantallas alimentan el mismo campo Customer.Email, así que tienen que
 * aceptar y rechazar exactamente lo mismo.
 *
 * Sin bandera /g a propósito: una regex global mantiene lastIndex entre llamadas a
 * test() y devolvería false de forma intermitente al reutilizar la misma instancia.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** true si la cadena (ya recortada) tiene formato de correo válido. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test((email || '').trim());
}
