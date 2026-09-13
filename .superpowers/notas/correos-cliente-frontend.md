# Añadir correos nuevos desde el selector de destinatarios

Rama: `fix/facturacion-ajustes-post-integracion`

## Qué pedía el usuario

Al pulsar "Facturar" el modal muestra a qué correo se va a enviar, pero no deja escribir
uno nuevo. Y los correos que se escriban deben quedar guardados en la ficha del cliente.

El problema era del componente compartido `email-selector-modal`, que era un *selector*
(solo pintaba botones para los correos que ya venían del cliente) y no un *editor*.

## Mecanismo elegido para exponer los correos nuevos

El modal ya no emite `string[]` en `(confirmAction)`; emite un objeto:

```ts
export interface EmailSelectionResult {
  emails: string[];     // todos los seleccionados (ficha del cliente + nuevos)
  newEmails: string[];  // solo los escritos a mano en esta apertura, y que siguen seleccionados
}
```

Se descartó una salida aparte (`@Output() newEmailsAdded`) precisamente por el orden: si
"correos nuevos" y "confirmar" llegan en dos eventos distintos, el guardado (asíncrono) y
el envío se ejecutan en paralelo y nada garantiza que se guarde antes de facturar. Con un
único evento, la pantalla recibe de golpe "a quién enviar" y "qué hay que guardar antes",
y el orden lo impone el propio código de la pantalla.

Detalles del modal (`src/app/shared/components/email-selector-modal/`):

- Campo de texto + botón "Añadir" (también con Enter). Validación con
  `isValidEmail()` de `src/app/shared/email-validation.ts`, extraído de
  `add-update-customer.component.ts` (que ahora lo importa en vez de tener la regex
  embebida): las dos pantallas alimentan el mismo `Customer.Email`, así que tienen que
  aceptar y rechazar lo mismo.
- No se permiten duplicados, comparando sin distinguir mayúsculas contra la ficha y
  contra los ya añadidos.
- Un correo recién añadido queda seleccionado de inmediato.
- En `newEmails` solo se reportan los que **siguen seleccionados** al confirmar: si el
  usuario escribió un correo y luego quitó el chip (dedazo corregido), no se guarda.
- **El modal no llama a ningún servicio.** Qué se hace con `newEmails` lo decide cada
  pantalla.
- Estado reiniciado en `openModal()` (`newEmails`, `newEmailInput`, `newEmailError`): es
  una instancia compartida entre flujos y ya hubo un bug de fuga de estado. Sin esto se
  podría acabar guardando en el cliente B un correo escrito para el cliente A.
- `ngOnChanges` conserva los correos escritos a mano al recalcular `selectedEmails`,
  porque varias pantallas asignan `[emails]` justo antes de abrir.

## Dónde se persiste

`CustomerService.addEmails(customerId, emails)` →
`POST {apiUrl}/api/Customer/customer/{customerId}/emails` con `{ emails: [...] }`.

Pantallas que persisten:

| Pantalla | Flujo | Cliente |
|---|---|---|
| `list-budget.component.ts` | Enviar PDF | `budget.customerDto` (`budgetToSendEmail`) |
| `list-budget.component.ts` | Enviar Excel | `budget.customerDto` (`budgetToSendEmail`) |
| `list-budget.component.ts` | Facturar | `budget.customerDto` (`budgetToInvoice`) |
| `list-invoice.component.ts` | Enviar / Reenviar factura | `invoice.customerDto` |

Los tres flujos de `list-budget` pasan por el mismo `onEmailsSelected`, que elige el
cliente según `emailSendType` y delega en `persistNewCustomerEmails(...)`; la acción real
(`sendEmailbudget` / `sendEmailBudgetExcel` / `confirmFacturar`) se ejecuta en el callback.

**Orden garantizado: primero guardar, después enviar/facturar.** Guardar un correo es
recuperable; emitir una factura consume numeración DIAN y es irreversible.

Si no hay correos nuevos (o no hay `customerId`), no se llama al endpoint: se ejecuta la
acción directamente.

`edit-invoice.component.ts` y las dos pantallas de informes de obra usan el mismo modal:
se adaptaron a la nueva firma (`result.emails`) pero **no** persisten `newEmails`, por
decisión explícita de alcance.

## Fallo del guardado

Nunca aborta el envío. El usuario quería mandar el correo, no editar la ficha del cliente.
Se continúa con la acción y se avisa **aparte**, con un toast de PrimeNG
(`severity: 'warn'`, "Correo no guardado en el cliente", 6 s), no con el modal de
resultado — porque ese modal lo va a ocupar el propio envío/facturación y se pisarían.
Se añade el mensaje del backend (`extractApiErrorMessage`) cuando viene.

En `list-budget` el toast usa `key: 'budget-inline'`, que es el `p-toast` que ya existe en
esa plantilla.

## Refresco del cliente en memoria

Tras un guardado correcto se aplica el `CustomerDTO` devuelto a **todas** las filas
cargadas de ese cliente (`applyUpdatedCustomer`), no solo a la fila sobre la que se actuó:
un cliente suele tener varias cotizaciones/facturas en el listado. Así, si el usuario
vuelve a abrir el modal (en esa fila o en otra del mismo cliente), ve el correo ya en la
lista. Se muta `customerDto.email` sobre el mismo objeto, que `filteredBudgets` /
`filteredInvoices` comparten por referencia — no se reasignan esos arrays (`filteredBudgets`
nunca debe convertirse en getter).

## Guardia de "cliente sin correos"

Retirada en los cuatro flujos. Antes abortaban con "El cliente no tiene correos
electrónicos configurados" sin ofrecer añadir ninguno; ahora el modal se abre igualmente y
el usuario escribe uno. El botón de confirmar sigue deshabilitado mientras no haya al menos
un correo seleccionado.

## Verificación

`npx ng build --configuration=development` → **correcto, sin errores ni avisos**
(bundle generado en `dist/cotiza-constructor`). El repo no tiene pruebas automatizadas para
estas pantallas y no se han creado `.spec.ts`.

## Qué queda sin verificar en navegador

- Aspecto real del campo nuevo dentro del `c-modal` de CoreUI (ancho, alineación con los
  chips, comportamiento en móvil). El CSS es conservador (flex con `flex-wrap`), pero no se
  ha visto renderizado.
- Que `keyup.enter` en el input no dispare, además de `addNewEmail()`, algún submit del
  formulario contenedor. El input está fuera de un `<form>`, así que no debería.
- Respuestas 400 reales del endpoint (correo inválido que la regex del front acepta pero el
  backend no, cliente de otra compañía): el texto del toast depende de que el backend
  responda con el contrato `{ error: '...' }`.
- Las tres pantallas fuera de alcance (`edit-invoice`, y las dos de informes de obra) solo
  se han verificado por compilación tras el cambio de firma.
- El caso "cliente sin ningún correo": el modal se abre con la lista vacía y el mensaje
  rojo "Debes seleccionar al menos un correo electrónico" visible desde el primer momento,
  hasta que se añade uno. Funcionalmente correcto, pero visualmente no se ha revisado.
