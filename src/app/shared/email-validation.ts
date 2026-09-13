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
 *
 * Es deliberadamente la MISMA que la del backend en CustomerApplicationService: si el
 * front fuera más laxo, el usuario podría pegar "uno@obra.com;dos@obra.com" como un solo
 * destinatario — el backend lo rechazaría (el ';' partiría la cadena Customer.Email) pero
 * el envío seguiría adelante con esa cadena como destinatario, y el correo rebotaría.
 * Se rechazan ';' y ',' por eso, y se exige un TLD de al menos dos caracteres.
 */
export const EMAIL_REGEX = /^[^@\s;,]+@[^@\s;,]+\.[^@\s;,]{2,}$/;

/** true si la cadena (ya recortada) tiene formato de correo válido. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test((email || '').trim());
}
