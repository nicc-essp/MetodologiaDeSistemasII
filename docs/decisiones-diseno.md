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
recibidas. Actualmente utiliza datos simulados mientras se desarrolla e integra
el backend.

La carpeta `services/` está prevista para centralizar las llamadas del frontend
a la API. Esta separación todavía no se encuentra completamente implementada,
ya que los endpoints necesarios se encuentran en desarrollo.

### Diagnóstico

Durante el desarrollo se observó que las páginas del frontend necesitan
comunicarse con el backend para enviar y obtener formularios.

Una alternativa sería realizar las llamadas HTTP directamente dentro de cada
componente o página. Sin embargo, esto haría que los componentes encargados de
la interfaz también conozcan detalles de la comunicación con la API.

Esto generaría dos motivos diferentes de cambio dentro de una misma página:
los cambios relacionados con la presentación de la información y los cambios
relacionados con la comunicación con el backend.

A medida que se incorporen nuevas operaciones, combinar ambas responsabilidades
puede aumentar el costo de mantenimiento y dificultar modificaciones futuras.

Por este motivo se analizó separar ambas responsabilidades, siguiendo los
criterios de mantenibilidad, Clean Code y SOLID trabajados en clase, buscando
que cada parte del sistema tenga responsabilidades claramente delimitadas.

### Alternativas consideradas

1. **Realizar las llamadas HTTP directamente dentro de cada página.**

   Es la alternativa más simple y requiere menos archivos. Para una aplicación
   pequeña podría ser suficiente, pero haría que las páginas conozcan tanto la
   presentación como los detalles de comunicación con el backend.

2. **Centralizar las llamadas HTTP dentro de `frontend/src/services/`.**

   Agrega una separación adicional, pero evita distribuir los detalles de los
   endpoints entre las distintas vistas. También facilita la reutilización y
   modificación de las operaciones relacionadas con la API.

3. **Incorporar un patrón de diseño adicional.**

   Se consideró la posibilidad de introducir una solución basada en un patrón
   de diseño, pero no se encontró por el momento un problema concreto que
   justificara agregar esa complejidad.

   Se decidió no incorporar un patrón únicamente para cumplir con su uso, ya
   que la separación mediante la carpeta `services/` resulta suficiente para
   el problema detectado actualmente.

### Decisión

Se decidió mantener separadas las responsabilidades de presentación y
comunicación con la API.

Las páginas y componentes serán responsables principalmente de presentar la
información y manejar la interacción con el usuario, mientras que las llamadas
HTTP serán ubicadas en `frontend/src/services/`.

Actualmente `ConsultasRecibidas.jsx` utiliza datos simulados debido a que el
endpoint de lectura todavía no se encuentra integrado. Estos datos respetan la
estructura acordada para los formularios y permiten desarrollar y verificar la
vista sin depender de que el backend esté terminado.

Una vez integrado el endpoint correspondiente, los datos simulados serán
reemplazados por una llamada al servicio encargado de obtener los formularios.

Por lo tanto, la separación fue definida como decisión de diseño, aunque su
implementación completa depende de la integración con el backend.

### Evidencia y trade-offs

Como evidencia actual se cuenta con:

- `ConsultaJuridica.jsx`, que representa la vista utilizada para completar una
  consulta.
- `ConsultasRecibidas.jsx`, que representa la vista utilizada para mostrar las
  consultas recibidas.
- La carpeta `frontend/src/services/`, prevista para contener la comunicación
  con la API.
- Una estructura de datos común para los formularios, compuesta por `id`,
  `nombre`, `apellido`, `dni`, `telefono`, `email`, `asunto` y `mensaje`.

**Beneficios de la decisión:**

- Evita distribuir detalles de los endpoints entre distintos componentes.
- Mantiene las páginas enfocadas principalmente en la presentación y la
  interacción con el usuario.
- Facilita modificar la comunicación con el backend sin tener que modificar
  directamente todas las vistas.
- Facilita la reutilización de las operaciones relacionadas con la API.
- Reduce la cantidad de responsabilidades concentradas dentro de los
  componentes de interfaz.

**Costos y desventajas:**

- Introduce archivos y una capa adicional en el frontend.
- Requiere mantener una separación entre las páginas y los servicios.
- Para una aplicación muy pequeña, realizar directamente un `fetch` dentro de
  la página sería una solución más sencilla.

Se consideró que el costo de agregar esta separación es aceptable porque la
aplicación prevé distintas operaciones con el backend, incluyendo el envío y la
lectura de formularios, y posteriormente podrá incorporar otras funcionalidades
que también requieran comunicación con la API.

La decisión busca reducir el costo de cambios futuros sin introducir
complejidad adicional que actualmente no sea necesaria.