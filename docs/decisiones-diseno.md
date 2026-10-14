# Decisiones de diseño

## 1. Separación entre las vistas y el acceso a la API

### Código analizado

Se analizó la estructura actual del frontend, principalmente:

- `frontend/src/pages/ConsultaJuridica.jsx`
- `frontend/src/pages/ConsultasRecibidas.jsx`
- `frontend/src/services/`

`ConsultaJuridica.jsx` contiene actualmente la interfaz para completar una
consulta jurídica.

`ConsultasRecibidas.jsx` contiene la vista destinada a mostrar las consultas
recibidas. Actualmente utiliza datos simulados mientras se desarrolla el
backend.

La carpeta `services/` está prevista para centralizar las llamadas del frontend
a la API.

### Diagnóstico

Durante el desarrollo se observó que las páginas del frontend necesitan
comunicarse con el backend para enviar y obtener formularios.

Una alternativa sería realizar las llamadas HTTP directamente dentro de cada
componente o página. Sin embargo, esto haría que los componentes encargados de
la interfaz también conozcan detalles de comunicación con la API.

Esto aumentaría sus responsabilidades y dificultaría modificar posteriormente
la forma en que el frontend se comunica con el backend.

### Alternativas consideradas

1. Realizar las llamadas HTTP directamente dentro de cada página.
   Es la alternativa más simple y requiere menos archivos.

2. Centralizar las llamadas HTTP relacionadas con las consultas dentro de
   `frontend/src/services/`.
   Agrega una separación adicional, pero evita repetir y distribuir detalles
   de la API entre las vistas.

3. Incorporar un patrón de diseño adicional.
   No se encontró por el momento un problema que justifique agregar mayor
   complejidad mediante un patrón específico.

### Decisión

Se decidió mantener separadas las responsabilidades de presentación y
comunicación con la API.

Las páginas y componentes serán responsables principalmente de presentar la
información y manejar la interacción con el usuario, mientras que las llamadas
HTTP serán ubicadas en `frontend/src/services/`.

Actualmente `ConsultasRecibidas.jsx` utiliza datos simulados porque el endpoint
de lectura todavía no se encuentra integrado. Una vez definido el contrato del
backend, los datos simulados serán reemplazados por una llamada al servicio
correspondiente.

### Evidencia y trade-offs

Beneficios:

- Evita distribuir detalles de los endpoints entre distintos componentes.
- Facilita modificar la comunicación con el backend.
- Permite reutilizar las operaciones sobre consultas.
- Mantiene las páginas enfocadas principalmente en la interfaz.

Costos:

- Introduce archivos y una capa adicional.
- Para una aplicación muy pequeña, realizar directamente un `fetch` dentro
  de la página sería una solución más sencilla.

Se consideró que esta separación es conveniente porque la aplicación prevé
tanto el envío como la lectura de formularios y continuará incorporando
funcionalidades relacionadas con la API.