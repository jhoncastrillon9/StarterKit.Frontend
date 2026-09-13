/**
 * Extraccion del mensaje de error de una respuesta HTTP del backend.
 *
 * El backend responde con dos formas distintas y hasta ahora el frontend solo sabia
 * leer la primera:
 *
 * 1. `{ error: 'mensaje en espanol' }` — lo produce StarterKitMiddleware al traducir
 *    una BadHttpRequestException de negocio. Ese texto esta escrito para el usuario
 *    final y se muestra tal cual.
 *
 * 2. `ValidationProblemDetails` — `{ title, status, errors: { campo: ['msg', ...] } }`.
 *    Lo genera automaticamente [ApiController] cuando el ModelState es invalido, antes
 *    de que la peticion llegue al controlador: tipos que no casan (por ejemplo enviar
 *    `2.5` a un `int Quantity`), campos requeridos que faltan, etc. Como nunca pasa por
 *    el middleware, no trae `error` y los handlers que solo miraban `error.error.error`
 *    acababan mostrando un texto generico sin ninguna pista de que habia fallado.
 *
 * Cualquier otra forma (500 con texto tecnico, error de red) devuelve null para que el
 * llamante use su propio mensaje de respaldo.
 */
export function extractApiErrorMessage(error: any): string | null {
  const body = error?.error;
  if (!body) { return null; }

  // Forma 1: contrato { error: mensaje }
  if (typeof body.error === 'string' && body.error.trim().length > 0) {
    return body.error.trim();
  }

  // Forma 2: ValidationProblemDetails -> { errors: { campo: [mensajes] } }
  const messages = collectValidationMessages(body.errors);
  if (messages.length > 0) {
    return messages.join(' ');
  }

  return null;
}

/**
 * Aplana el diccionario `errors` de ValidationProblemDetails a una lista de mensajes.
 * Se ignoran las claves (son rutas del JSON como `$.invoiceDetailsDto[0].quantity`,
 * inutiles para el usuario) y se descartan duplicados.
 */
function collectValidationMessages(errors: any): string[] {
  if (!errors || typeof errors !== 'object') { return []; }

  const messages: string[] = [];
  Object.keys(errors).forEach(key => {
    const value = errors[key];
    const list: any[] = Array.isArray(value) ? value : [value];
    list.forEach(item => {
      if (typeof item === 'string' && item.trim().length > 0 && !messages.includes(item.trim())) {
        messages.push(item.trim());
      }
    });
  });
  return messages;
}

/**
 * true cuando el 400 viene de una validacion de ModelState (ValidationProblemDetails) y
 * no del contrato de negocio { error: mensaje }. Sus textos los escribe .NET, suelen ser
 * tecnicos y en ingles, asi que conviene acompanarlos de una explicacion propia en vez de
 * soltarlos a secas.
 */
export function isValidationProblemDetails(error: any): boolean {
  const body = error?.error;
  if (!body || typeof body.error === 'string') { return false; }
  return collectValidationMessages(body.errors).length > 0;
}
