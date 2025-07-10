# Cotiza Constructor - Documentación del Frontend

## Descripción
Cotiza Constructor es una aplicación Angular para la gestión y cotización de proyectos de construcción, desarrollada por ingenieros de la big tech CAV. Proporciona una interfaz intuitiva y amigable para usuarios de empresas constructoras.

## Cambios Recientes (2024)

### Mejoras y Nuevas Funcionalidades
- **Campo Estado en Cotizaciones:**
  - Se agregó el campo `estado` al modelo de cotización, visible en la lista, creación y edición de cotizaciones.
  - El campo `estado` se muestra como un label fucsia en la lista y viaja correctamente al backend.
- **UX en Formulario de Cotización:**
  - El campo `estado` ahora aparece junto al campo `Factura` en la parte inferior del formulario.
  - Al crear una nueva cotización, solo el campo IVA está marcado por defecto; los campos "Aplicar AIU" y "Sumar AIU" están desmarcados.
  - Al editar, se mantienen los valores que vienen del backend.
- **Forma de Pago por Defecto:**
  - Se actualizó la forma de pago por defecto a: "70% Para iniciar la obra, 20% en el transcurso de la obra y 10% Al finalizar Obra".
- **Mejoras en Login:**
  - Se corrigió la visualización del loading/cargando al iniciar sesión.
- **Scripts de Desarrollo:**
  - Se agregó el script `npm run start:dev` para facilitar el desarrollo local sin afectar el despliegue en producción.

### Corrección de Bugs
- **Filtro por Código:**
  - Ahora la búsqueda global en la lista de cotizaciones también filtra por la columna de código (`internalCode`).
- **Fecha al Editar Cotización:**
  - Al editar una cotización, la fecha ya no se actualiza automáticamente; solo se actualiza al crear una nueva.

## Características
- **Cotizaciones Precisas:** Calcula costos automáticamente con precios colombianos actualizados.
- **Gestión de Proyectos:** Controla y organiza proyectos de construcción de manera eficiente.
- **Interfaz Intuitiva:** Diseño amigable para una experiencia de usuario sin complicaciones.

## Requisitos Previos
- Node.js >= 18
- Angular CLI
- npm

## Instalación
1. Clona este repositorio: `git clone https://github.com/tuusuario/cotiza-constructor.git`
2. Navega al directorio del frontend: `cd cotiza-constructor/frontend`
3. Instala las dependencias: `npm install`

## Configuración del Backend (.NET)
El frontend está diseñado para trabajar en conjunto con un backend .NET. Asegúrate de tener configurado y ejecutando el backend antes de utilizar el frontend.

## Uso
- **Desarrollo local:** `npm run start:dev`
- **Producción/Despliegue:** `npm run build` y luego servir el contenido de `dist/cotiza-constructor`.

Abre tu navegador y accede a `http://localhost:4200`

## Contribuciones
¡Contribuciones son bienvenidas! Si encuentras errores o tienes ideas para mejorar la aplicación, por favor, abre un issue o envía un pull request.

## Licencia
Este proyecto utiliza una licencia privada. El código fuente no está disponible públicamente.

---

**Resumen de Cambios a Revisar:**
- Campo `estado` en modelo, formulario y listado de cotizaciones.
- Campo `estado` viaja al backend.
- Campo `estado` junto a factura en el formulario.
- Solo IVA marcado por defecto en nuevas cotizaciones.
- Filtro por código en listado de cotizaciones.
- Fecha no se actualiza al editar cotización.
- Loading en login.
- Script `start:dev` para desarrollo local.
- Forma de pago por defecto actualizada.
