import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

/**
 * Lo que necesita cualquier componente de la aplicación para poder instanciarse
 * en un test.
 *
 * Todos los componentes con pantalla piden por inyección algún servicio, y todos
 * los servicios piden HttpClient. Sin esto el test falla antes de llegar a la
 * primera comprobación, y el mensaje —«No provider for HttpClient»— no dice nada
 * sobre el componente que se estaba probando.
 *
 * `provideRouter([])` aporta de paso el `ActivatedRoute` raíz, que es lo que leen
 * los formularios de edición para saber qué id abrir. Y las animaciones van en
 * modo inerte: CoreUI declara transiciones en sus plantillas y sin un motor de
 * animaciones el propio Angular aborta el renderizado.
 */
export const testProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
];
