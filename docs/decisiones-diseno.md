# Decisiones de diseño

## 1. Separación entre las vistas y el acceso a la API

### Código analizado

Se analizó la estructura del frontend, principalmente:

- `frontend/src/pages/ConsultaJuridica.jsx`
- `frontend/src/pages/ConsultasRecibidas.jsx`
- `frontend/src/services/formularioService.js`

`ConsultaJuridica.jsx` contiene la interfaz utilizada para completar una
consulta jurídica.

`ConsultasRecibidas.jsx` contiene la vista destinada a mostrar las consultas
recibidas.

`formularioService.js` centraliza las operaciones HTTP relacionadas con los
formularios y actualmente define las funciones:

- `crearFormulario(formulario)`
- `obtenerFormulario(id)`
- `obtenerFormularios()`

### Diagnóstico

Durante el desarrollo se observó que distintas páginas del frontend necesitan
comunicarse con el backend para enviar y obtener formularios.

Una alternativa era realizar las llamadas HTTP directamente dentro de cada
página. Sin embargo, esto haría que los componentes encargados de la interfaz
también conozcan detalles de la comunicación con la API, como las URLs de los
endpoints, los métodos HTTP y el tratamiento básico de las respuestas.

Esto generaría dos motivos diferentes de cambio dentro de las páginas:

1. Cambios relacionados con la presentación y la interacción con el usuario.
2. Cambios relacionados con la comunicación con el backend.

A medida que se incorporen nuevas operaciones, distribuir esta lógica entre
distintas vistas puede aumentar el costo de mantenimiento y provocar
duplicación.

Por este motivo se analizó separar ambas responsabilidades, aplicando criterios
de mantenibilidad, Clean Code y separación de responsabilidades trabajados en
clase.

### Alternativas consideradas

1. **Realizar las llamadas HTTP directamente dentro de cada página.**

   Es la alternativa más simple y requiere menos archivos. Para una aplicación
   muy pequeña podría ser suficiente.

   Sin embargo, las páginas quedarían responsables tanto de la presentación
   como de detalles de infraestructura relacionados con la API.

2. **Centralizar las llamadas HTTP dentro de `frontend/src/services/`.**

   Agrega una capa adicional, pero evita distribuir URLs, métodos HTTP y manejo
   básico de errores entre las distintas vistas.

   También permite reutilizar las operaciones y concentrar futuros cambios en
   la comunicación con el backend.

3. **Incorporar un patrón de diseño adicional.**

   Se consideró introducir un patrón de diseño, pero no se encontró un problema
   concreto que justificara agregar esa complejidad.

   Se decidió no incorporar un patrón únicamente por utilizarlo, ya que una
   separación mediante servicios resulta suficiente para el problema actual.

### Decisión

Se decidió separar las responsabilidades de presentación y comunicación con la
API.

Las páginas se mantienen responsables de la presentación de información y de
la interacción con el usuario, mientras que las operaciones HTTP relacionadas
con formularios fueron centralizadas en
`frontend/src/services/formularioService.js`.

El servicio implementa actualmente:

- `crearFormulario(formulario)`, preparado para `POST /formulario`.
- `obtenerFormulario(id)`, preparado para `GET /formulario/:id`.
- `obtenerFormularios()`, preparado para `GET /formulario`.

La conexión definitiva de estas operaciones con las vistas depende de completar
e integrar los endpoints correspondientes del backend.

`ConsultasRecibidas.jsx` continúa utilizando temporalmente datos simulados para
permitir el desarrollo de la interfaz sin depender de que la API esté
completamente terminada.

### Evidencia y trade-offs

Como evidencia se cuenta con:

- `ConsultaJuridica.jsx`, vista utilizada para completar una consulta.
- `ConsultasRecibidas.jsx`, vista utilizada para mostrar consultas recibidas.
- `formularioService.js`, que centraliza la comunicación relacionada con los
  formularios.
- Las funciones `crearFormulario`, `obtenerFormulario` y
  `obtenerFormularios`.

**Beneficios:**

- Evita repetir URLs y detalles HTTP entre diferentes páginas.
- Mantiene las vistas enfocadas principalmente en presentación e interacción.
- Centraliza cambios futuros relacionados con la API.
- Facilita reutilizar las mismas operaciones desde distintas partes del
  frontend.
- Reduce la cantidad de responsabilidades concentradas en los componentes.

**Costos y desventajas:**

- Introduce una capa y archivos adicionales.
- Requiere mantener correctamente la separación entre vistas y servicios.
- Para una aplicación muy pequeña, realizar directamente un `fetch` desde una
  página sería más sencillo.

Se consideró que este costo es aceptable porque la aplicación ya requiere
distintas operaciones sobre formularios y se prevé incorporar otras
funcionalidades que también necesitarán comunicación con el backend.

La decisión busca reducir el costo de cambios futuros sin introducir
complejidad que actualmente no sea necesaria.


## 2. Unificación del contrato de datos de los formularios

### Código analizado

Se analizaron principalmente:

- `frontend/src/pages/ConsultaJuridica.jsx`
- `frontend/src/pages/ConsultasRecibidas.jsx`
- `backend/models/formulario.ts`

El modelo de formulario utilizado como referencia contiene los siguientes
campos:

- `id`
- `nombre`
- `apellido`
- `dni`
- `telefono`
- `email`
- `asunto`
- `mensaje`

Durante la revisión se detectó que las distintas partes de la aplicación no
representaban un formulario de la misma manera.

### Diagnóstico

`ConsultaJuridica.jsx` manejaba originalmente los campos:

- `nombre`
- `email`
- `telefono`
- `area`
- `mensaje`

Además, el campo `nombre` contenía conjuntamente nombre y apellido.

En cambio, `backend/models/formulario.ts` definía:

- `id`
- `nombre`
- `apellido`
- `dni`
- `telefono`
- `email`
- `asunto`
- `mensaje`

Por su parte, `ConsultasRecibidas.jsx` ya utilizaba datos simulados compatibles
con esta segunda estructura.

Esto producía una inconsistencia concreta: la vista encargada de mostrar
formularios esperaba información que la vista encargada de crearlos nunca
generaba.

También existía una diferencia semántica entre `area` en el formulario de
envío y `asunto` en el modelo.

Si se conectaba el frontend con la API sin corregir previamente esta
inconsistencia, el contrato entre ambas partes no habría coincidido.

### Alternativas consideradas

1. **Mantener estructuras diferentes y transformar los datos al realizar el
   envío.**

   Se podría haber mantenido `ConsultaJuridica.jsx` sin cambios y construir
   posteriormente un objeto compatible con el backend.

   Esto habría requerido separar manualmente nombre y apellido, decidir cómo
   transformar `area` en `asunto` y obtener un DNI que el formulario ni
   siquiera solicitaba.

   Por lo tanto, además de agregar lógica de transformación, algunos datos
   necesarios directamente no estaban disponibles.

2. **Modificar el modelo del backend para adaptarlo al formulario existente.**

   Era técnicamente posible simplificar el modelo para que coincidiera con la
   interfaz existente.

   Sin embargo, `ConsultasRecibidas.jsx` ya utilizaba la estructura acordada y
   campos como apellido, DNI y asunto forman parte de los datos previstos para
   una consulta.

3. **Unificar el formulario de entrada con el modelo acordado.**

   Esta alternativa permite que las distintas partes del sistema trabajen sobre
   una misma representación del formulario y evita transformaciones
   innecesarias.

### Decisión

Se decidió modificar `ConsultaJuridica.jsx` para utilizar los mismos campos
acordados para los formularios:

- `nombre`
- `apellido`
- `dni`
- `telefono`
- `email`
- `asunto`
- `mensaje`

El campo `id` no se solicita al usuario porque corresponde a la identificación
del formulario una vez creado.

También se eliminó temporalmente el mensaje que indicaba que la consulta había
sido enviada con éxito.

Anteriormente ese mensaje se mostraba después de ejecutar únicamente lógica
local en el navegador, sin que existiera una comunicación real con el servidor.
Por lo tanto, la interfaz afirmaba un resultado que todavía no había ocurrido.

El mensaje de éxito deberá mostrarse únicamente cuando la operación real de
creación del formulario finalice correctamente.

### Evidencia y trade-offs

La inconsistencia fue detectada comparando directamente:

- El estado `formData` original de `ConsultaJuridica.jsx`.
- La interfaz `Formulario` definida en `backend/models/formulario.ts`.
- Los datos utilizados por `ConsultasRecibidas.jsx`.

Como resultado del refactor, `ConsultaJuridica.jsx` genera actualmente los
campos:

`nombre`, `apellido`, `dni`, `telefono`, `email`, `asunto` y `mensaje`.

Estos coinciden con los datos del formulario utilizados por el resto del
sistema, con excepción de `id`, que no corresponde que sea ingresado
manualmente por el usuario.

**Beneficios:**

- Reduce inconsistencias entre frontend y backend.
- Evita transformaciones innecesarias antes de enviar los datos.
- Hace explícito qué información compone una consulta.
- Facilita la posterior integración con la API.
- Reduce el riesgo de que una vista espere información que otra parte del
  sistema nunca genera.

**Costos y desventajas:**

- Fue necesario modificar una interfaz que ya estaba desarrollada.
- El formulario pasó a solicitar más información al usuario.
- Frontend y backend quedan vinculados a un contrato que deberá mantenerse de
  forma coordinada cuando cambie.

Se consideró que estos costos son menores que mantener representaciones
incompatibles del mismo concepto dentro del sistema.