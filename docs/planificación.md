# Planificación preliminar de evolución de Docker-laws

**Fecha de referencia:** 14 de noviembre de 2026.

**Actualización de decisiones:** 15 de noviembre de 2026.

**Actualización de seguimiento:** 18 de noviembre de 2026: cierre técnico de P04 y aprobación de P04.4b.

**Estado:** estructura y distribución preliminar aprobadas por Homero; asignaciones pendientes de aceptación por los integrantes. D01–D04 registradas con los acuerdos y verificaciones de la sección 4. P03 completada y aprobada formalmente por Homero el 15 de noviembre de 2026; P04 técnicamente completada tras la validación y aprobación de P04.4b del 18 de noviembre de 2026. P01 y P02 siguen pendientes de revisión formal por separado; no se cierran las demás tareas.

**Alcance:** planificación técnica. Este documento no autoriza implementación, instalaciones, despliegues ni operaciones de escritura de Git.

## 1. Objetivos de la evolución del proyecto

Preparar una evolución gradual del prototipo de Taller II, conservando sus comportamientos comprobados y permitiendo distribuir entregables entre cuatro integrantes.

- Incorporar como primer incremento la persistencia de las consultas existentes mediante PostgreSQL, Sequelize 6, `pg` y migraciones Umzug. Los hitos local y Supabase de desarrollo de P04 están técnicamente completados, con evidencias separadas en la sección 8.
- Preparar cuentas, seguimiento de casos y comunicación como funcionalidades previstas, sujetas a definición y aprobación.
- Evaluar Caddy para proxy inverso y HTTPS en un entorno acordado.
- Conservar separación de responsabilidades, validación, accesibilidad, contratos y pruebas durante cada incremento.
- Facilitar la actualización del plan cuando se reciban las consignas oficiales del Taller III.

**El alcance de persistencia está aprobado y P04 está técnicamente completada; P01/P02 conservan su revisión formal pendiente.** Los acuerdos se registran en [Decisiones aprobadas para el primer incremento de persistencia](decisiones-diseno.md#7-decisiones-aprobadas-para-el-primer-incremento-de-persistencia). Toda nueva ejecución requiere autorización en modo SUPERVISADO. No se incluyen cuentas, casos, representantes, mensajes ni Caddy en este incremento; tampoco requisitos académicos supuestos o fechas no acordadas.

## 2. Estado actual de Docker-laws

La referencia es el código inspeccionado, el [README](../README.md) y las [decisiones de diseño](decisiones-diseno.md). No se encontraron consignas oficiales adicionales en la documentación disponible. El README interno del frontend corresponde principalmente a la plantilla de Vite.

| Área | Funcionalidad comprobada y evidencia |
| --- | --- |
| Interfaz | React, Vite y JavaScript; inicio, formulario y consultas recibidas en `frontend/src/App.jsx` y `frontend/src/pages/`. No existe una vista específica de detalle individual. |
| API | Express y TypeScript: `POST /formulario`, `GET /formulario`, `GET /formulario/:id` y `GET /health`, definidos en `backend/routes/` y `backend/app.ts`. |
| Datos | `app.consultas` conserva los siete textos y un `id` numérico generado por PostgreSQL. Modelo Sequelize y migración Umzug en `backend/models/consulta.model.ts` y `backend/migrations/`; acceso en `backend/data/formularios-postgres.ts`. Persistencia comprobada localmente y en Supabase de desarrollo. Memoria por instancia solo para pruebas aisladas, sin fallback. |
| Responsabilidades | Aplicación separada del arranque; controlador, validación pura, almacenamiento y middleware de errores en módulos distintos. Contrato asíncrono de creación, listado y búsqueda, con inyección de dependencias. |
| Comunicación HTTP | `frontend/src/services/formularioService.js` centraliza operaciones y controla respuestas y mensajes. La interfaz distingue carga, éxito y error y conserva campos ante fallos. |
| Configuración | `VITE_API_BASE_URL` y `CORS_ORIGINS` configurables. CORS limita lectura desde el navegador; no autentica ni autoriza. |
| Calidad | Pruebas backend con `node:test`, pruebas frontend con Vitest y Testing Library, comprobación TypeScript, lint frontend y build. Scripts en los manifiestos de cada componente. |
| Contenedores | Compose ejecuta frontend, backend y PostgreSQL 17.12 local, sin activar un perfil adicional. Desarrollo usa un volumen nombrado; las pruebas tienen Compose, credenciales y almacenamiento independientes. Las imágenes de aplicación son de desarrollo; el frontend inicia Vite. Hay exclusiones y verificaciones Docker con fixtures sintéticos en `scripts/`. La validación Supabase utilizó React y Express locales, no un despliegue público. |

**La aplicación actual no dispone de autenticación ni autorización para acceder a las consultas.** El listado y el detalle se encuentran accesibles sin comprobar identidad o pertenencia. El uso del prototipo debe permanecer limitado a datos ficticios en un entorno controlado.

Sequelize, las migraciones y el acceso PostgreSQL local/Supabase de desarrollo están implementados y verificados para consultas. Cuentas, autorización funcional, casos, comunicación y Caddy siguen pendientes. Una base remota operativa no publica la aplicación ni habilita datos personales reales.

La revisión manual del prototipo refactorizado fue completada satisfactoriamente por el usuario con Chrome y Narrador en Windows 10, después de las correcciones de CORS y de la CLI Docker. El README y las decisiones de diseño reflejan esa evidencia humana, diferenciada de las pruebas automatizadas existentes. La regresión automatizada de P03 se registra en la sección 8; no se repitió la revisión manual de accesibilidad. Las pantallas o funcionalidades nuevas y los cambios en los flujos afectados requerirán sus propias revisiones.

## 3. Tecnologías y funcionalidades previstas

Estas tecnologías y previsiones provienen de Taller II y del contexto aportado por el equipo; **no son requisitos oficiales definitivos del Taller III**. Las filas de persistencia distinguen lo ya validado en P04 de las funcionalidades futuras.

| Previsión | Encaje técnico propuesto | Límite pendiente |
| --- | --- | --- |
| Supabase PostgreSQL | Validado en P04.4b sobre un proyecto exclusivo de desarrollo: PostgreSQL 17.12, Session pooler/5432 y TLS verificado. | Data API desactivada y SSL obligatorio; no acredita despliegue público, acceso de clientes ni otros proyectos. Nuevas operaciones requieren autorización. |
| Sequelize 6, `pg` y Umzug | Sequelize 6.37.8, `pg` 8.23.1 y Umzug 3.8.3 incorporados, con migración e historial verificados. | Compatibilidad Node/TypeScript/ESM/pnpm comprobada en P04.2; `pg-hstore` no requerido para INTEGER/TEXT. Revisar al cambiar versiones o tipos. |
| Caddy | Entrada HTTP(S), proxy y, según el entorno, servicio de archivos construidos del frontend. | Entorno objetivo, rutas, dominio, certificados y separación entre desarrollo y una eventual entrega desplegable. |
| Cuentas de clientes | Identidad y acceso a información propia según reglas aprobadas. | Flujos de cuenta, sesiones, estrategia de autenticación y permisos. |
| Seguimiento de casos | Representación y consulta de casos jurídicos. | Relación con consultas, responsables, estados y operaciones permitidas. |
| Comunicación | Interacción entre clientes y representantes. | Canal, alcance, participantes y vinculación o no con un caso. |

La propuesta mantiene React → API Express → Sequelize → PostgreSQL, sin agregar un segundo camino de datos desde el navegador por defecto. Supabase Auth es una alternativa por evaluar, no una consecuencia automática de elegir su base de datos. Tampoco se presuponen chat en tiempo real, adjuntos, notificaciones o integraciones externas.

La integración de persistencia adaptó el contrato asíncrono y los errores de acceso a datos con una frontera pequeña para memoria y PostgreSQL. No se agregó un Repository genérico, contenedor de dependencias ni capa que solo delegue.

## 4. Decisiones técnicas y estado

Homero coordina y tiene autoridad técnica sobre arquitectura, datos y contratos dentro del alcance acordado. Los cambios de alcance, las decisiones condicionadas por consignas y los compromisos de otros integrantes requieren aprobación correspondiente.

| ID | Decisión | Estado, condiciones y coordinación |
| --- | --- | --- |
| D01 | Primer incremento de persistencia local; Supabase como segundo hito de P04. | Alcance aprobado por Homero. P03 y ambos hitos técnicos de P04 completados; P04.4b aprobada el 18/11/2026. P01/P02 pendientes de revisión formal; consignas oficiales y aceptación de asignaciones por el equipo también pendientes. |
| D02 | `app.consultas`, siete textos e ID numérico generado; contacto histórico, base inicialmente vacía y DER mínimo evaluado hasta 3FN. | Aprobada. Rechazo HTTP 400 de NUL/Unicode mal formado con regresiones obligatorias; los demás comportamientos válidos se conservan. Homero revisará la evidencia de P02; entidades y relaciones futuras no aprobadas. |
| D03 | Sequelize 6, controlador `pg` y migraciones versionadas con Umzug; arquitectura mínima. | Condiciones técnicas verificadas en P04: versiones compatibles, INTEGER/TEXT sin `pg-hstore`, `app."SequelizeMeta"` y separación de permisos. Migración local y remota comprobadas. Prohibidos `sync({ force: true })` y `sync({ alter: true })`. |
| D04 | PostgreSQL local con Docker, desarrollo/pruebas separados y perfil Supabase de desarrollo. | P03 verificada y P04.4b validada: PostgreSQL 17.12, Session pooler/5432, TLS verificado, Data API desactivada, SSL obligatorio y roles separados. Compose/pruebas/limpieza siguen siendo locales; Martín conserva P11/P12. Sin datos personales reales ni despliegue público. |
| D05 | Proveedor de identidad, flujos de cuenta y manejo de sesiones. | Antes de P05/P06; Homero y Matías, con Nicolás para el contrato del navegador. No implementar criptografía propia. |
| D06 | Quién puede crear, listar y ver consultas; relación entre identidad y datos; controles del servidor y eventual protección en PostgreSQL. | Antes de P05 y de cualquier uso real; Homero y equipo. Los cambios de acceso a rutas existentes requieren aprobación explícita. |
| D07 | Diferencia entre consulta y caso, relaciones con clientes y representantes, estados y acciones válidas. | Antes de P07/P08; Homero, Matías y Nicolás. Enviar una consulta no debe asumirse equivalente a abrir un expediente. |
| D08 | Canal de comunicación, participantes, persistencia y dependencia respecto de los casos. | Antes de P09/P10; Homero, Matías y Nicolás. |
| D09 | Entorno de Caddy, dominio o nombre local, rutas y posibles prefijos, certificados, configuración del frontend y política CORS. | Antes de P11; Homero y Martín, con Nicolás. No constituye autorización para desplegar. |

El registro de acuerdos por sí solo no acredita implementación: los cierres técnicos de P03 y P04 se basan en las evidencias de la sección 8. No completan P01/P02 ni P12/P13. D05–D09 continúan pendientes; de D06 solo se resolvieron credenciales, privilegios técnicos de base y exposición del entorno controlado. Los roles de aplicación/migrador no autentican clientes ni autorizan acceso a sus consultas.

Referencias técnicas: [conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [seguridad por filas](https://supabase.com/docs/guides/database/postgres/row-level-security), [migraciones Sequelize](https://sequelize.org/docs/v6/other-topics/migrations/) y [HTTPS de Caddy](https://caddyserver.com/docs/automatic-https). La validación de P04 corresponde al entorno de desarrollo comprobado; no se extiende automáticamente a otro modo de conexión, proyecto o despliegue.

## 5. Fases de desarrollo

| Fase | Tareas | Resultado y condición de avance |
| --- | --- | --- |
| 1. Delimitación y contratos | P01–P02 | Decisiones mínimas y contrato del incremento aprobados; funcionalidades futuras identificadas como pendientes. |
| 2. Persistencia de consultas | P03–P04 | Completadas técnicamente: entorno local aislado, persistencia funcional de consultas y validación real contra Supabase de desarrollo. P01/P02 conservan su revisión formal independiente. |
| 3. Cuentas y permisos | P05–P06 | Identidad y acceso comprobados según D05/D06. Requiere autorización específica de alcance. |
| 4. Seguimiento de casos | P07–P08 | Operaciones y vistas de casos según D07 aprobada. |
| 5. Comunicación | P09–P10 | Canal y permisos aprobados, con integración cliente/representante. |
| 6. Infraestructura e integración | P11–P13 | Proxy del entorno acordado, evidencias conjuntas y documentación. P11 puede adelantarse en paralelo tras D09. |

P12 y P13 conservan las dependencias de la sección 7 y no se cierran por completar P04. Ambos hitos de persistencia tienen evidencia separada en la sección 8. Ningún hito aprueba funcionalidades futuras. Si una consigna cambia el alcance, se actualizan las tareas afectadas antes de ejecutarlas.

## 6. Distribución por integrante

Las siguientes asignaciones son **propuestas pendientes de aceptación por Homero, Matías, Nicolás y Martín**. La carga se expresa de forma relativa; no representa una estimación de horas.

| Integrante | Tareas principales | Responsabilidad y entregables | Carga relativa |
| --- | --- | --- | --- |
| Homero | P01, P02, P03, P04, P13 | Arquitectura, modelo de datos, contratos, entorno aislado de pruebas de persistencia y limpieza protegida, integración principal Sequelize/Supabase, migraciones iniciales y coordinación de integración. Revisa decisiones estructurales de los demás módulos. | Mayor carga técnica y responsabilidad transversal. |
| Matías | P05, P07, P09 | Backend de cuentas, permisos, casos y comunicación; validaciones, reglas, migraciones de sus módulos según el modelo acordado y pruebas propias. | Alta; responsabilidad funcional y de seguridad del backend. |
| Nicolás | P06, P08, P10 | Vistas, servicios y navegación de cuentas, casos y comunicación; estados de error, accesibilidad y pruebas propias. | Alta; responsabilidad sobre los flujos de interfaz. |
| Martín | P11, P12 | Infraestructura, Docker, Caddy y verificaciones de integración; integración del entorno definido en P03, configuraciones, comprobaciones propias y evidencia reproducible. | Media/alta, concentrada en infraestructura e integración. |

Cada integrante implementa y prueba su trabajo. Homero coordina decisiones y revisiones, pero **no asume la implementación de las tareas de los demás**. Los autores presentan propuestas completas para revisión; los acuerdos de contratos permiten avanzar sin consultas continuas sobre detalles locales.

P03 corresponde exclusivamente a Homero, quien podrá ejecutar P01–P04, cuando se autoricen, sin depender de la disponibilidad de otros integrantes. P12 conserva a Martín como responsable de la verificación conjunta de las entregas; no es un prerrequisito de P03 ni P04.

| Punto compartido | Coordinación propuesta para evitar conflictos |
| --- | --- |
| `backend/app.ts`, `index.ts` y contrato de datos | Homero coordina cambios; Matías integra sus módulos mediante modificaciones pequeñas acordadas. |
| Modelos y migraciones | Homero define/revisa el modelo. Matías escribe las de sus módulos en archivos separados; se acuerdan nombres, orden y claves antes de integrar. |
| Manifiestos y lockfiles | Cambios serializados por componente. Cada modificación justifica dependencias y conserva juntos manifiesto y lockfile. |
| `frontend/src/App.jsx` y navegación | Nicolás coordina el frontend y adapta los contratos acordados con Homero y Matías. |
| Compose, Dockerfiles y configuración de conexión | Homero prepara la configuración de persistencia y pruebas de P03/P04. Martín coordina los ajustes de infraestructura de P11/P12; Nicolás verifica la URL realmente alcanzable por el navegador. Los cambios sobre archivos compartidos se acuerdan antes de integrar. |
| Pruebas conjuntas | Homero prepara y verifica el entorno aislado de P03. Martín coordina su uso en los recorridos integrados de P12; cada autor corrige y verifica los fallos de su módulo. |

## 7. Tareas con identificadores y dependencias

**P03 está completada y aprobada por Homero**, con evidencia en la sección 8. Las demás tareas permanecen pendientes de evaluación de sus criterios y de ejecución técnica autorizada. D01–D04 cuentan con el registro de acuerdos del 15 de noviembre de 2026; sus condiciones pendientes impiden equiparar aprobación con finalización. El cierre de P03 no completa automáticamente P01, P02 ni P04. Las rutas de módulos nuevos se acordarán al cerrar sus contratos; los directorios indicados son áreas de trabajo, no archivos ya existentes.

| ID | Entregable técnico y áreas afectadas | Responsable | Dependencias para iniciar y cerrar |
| --- | --- | --- | --- |
| P01 | Alcance autorizado, riesgos, decisiones y matriz de compatibilidad de herramientas; documentación compartida. | Homero | Sin tareas previas; requiere acuerdo sobre el incremento. |
| P02 | Modelo mínimo, contrato de consultas y criterios para extender modelos, permisos y API por módulo. `backend/models/`, rutas y servicios frontend como referencia. | Homero | P01. Cerrar primero consultas; los contratos futuros requieren aprobación antes de sus módulos. |
| P03 | **Completada y aprobada el 15/11/2026.** Entorno PostgreSQL local, base de pruebas aislada, fixtures y limpieza segura; instrucciones reproducibles en README. | Homero | P01 y decisiones D03/D04 aplicables. No requiere implementar P04; su cierre no acredita las demás tareas. |
| P04 | **Técnicamente completada el 18/11/2026.** Persistencia de consultas con Sequelize, migraciones, adaptación asíncrona y ciclo de conexión; hitos local y Supabase de desarrollo verificados. Áreas: configuración, datos, modelos, migraciones, controlador, router, app, arranque, pruebas y manifiesto. | Homero | P02, P03 y condiciones de D02–D04 para cada hito. Ambos hitos acreditados; el cierre técnico no completa la revisión formal pendiente de P01/P02. |
| P05 | Cuentas y autorización en API, con pruebas de identidad y pertenencia. Módulos backend nuevos y migraciones correspondientes. | Matías | P04, D05/D06 y contrato de cuentas aprobado. |
| P06 | Interfaz de cuentas y sesión; páginas, servicios y navegación frontend. | Nicolás | Puede iniciar con contrato de cuentas aprobado en P02 y D05/D06; cerrar requiere P05 integrado. |
| P07 | Backend de seguimiento de casos, relaciones y operaciones autorizadas. | Matías | P05, D07 y contrato de casos aprobado. |
| P08 | Vistas y servicios de seguimiento, con estados accesibles. | Nicolás | P06 y contrato de casos aprobado; cerrar requiere P07 integrado. |
| P09 | Backend del canal de comunicación acordado, con persistencia si corresponde y permisos comprobados. | Matías | P05, D08 y contrato aprobado; también P07 si la comunicación se vincula a casos. |
| P10 | Interfaz y servicios de comunicación según el canal acordado. | Nicolás | P06, D08 y contrato aprobado; cerrar requiere P09 y, si corresponde, P08. |
| P11 | Configuración de Caddy, Compose y contenedores para el entorno aprobado; coordinación de API, certificados y configuración pública. | Martín | P02 y D09. Puede trabajar con la API actual antes de cerrar módulos nuevos. |
| P12 | Recorrido integrado reproducible, pruebas entre componentes y evidencia de infraestructura del incremento autorizado. | Martín | P04 y cierre de las tareas P05–P11 incluidas en esa entrega. |
| P13 | Revisión final de contratos, datos, seguridad y regresión; documentación y pendientes de la entrega. | Homero | P12 y evidencias de los autores. No cierra tareas fuera de la entrega. |

Las dependencias son de avance, no asignaciones adicionales. Trabajar contra respuestas simuladas no satisface el requisito de integración real.

### Incrementos técnicos dentro de las tareas grandes

Cada paso incluye sus pruebas y puede requerir uno o varios commits. No se deben separar cambios si dejan consumidores incompatibles.

| Tarea | Secuencia breve de incrementos coherentes |
| --- | --- |
| P01–P02 | Revisar los acuerdos D01–D04 ya registrados; completar condiciones de compatibilidad y contrastar modelo/contrato con ejemplos y criterios. Extender contratos solo al autorizar cada módulo futuro. |
| P03 | Preparar configuración del entorno aislado; incorporar fixtures y limpieza protegida; Homero comprueba la reproducción desde un entorno limpio y documenta los pasos para otro integrante. |
| P04 | Adaptar contrato y consumidores a operaciones asíncronas conservando memoria para pruebas aisladas; incorporar conexión, modelo y migración; comprobar el flujo local real y sus regresiones. Posteriormente validar contra Supabase. La memoria no debe convertirse en fallback silencioso; la base persistente inicia vacía. |
| P05 | Integrar identidad y sesión según D05; incorporar perfiles/permisos según D06; aplicar controles a las rutas acordadas y verificar accesos cruzados. Cada parte publicada en la rama de integración debe conservar sus controles necesarios. |
| P06 | Incorporar servicios y estados de sesión; agregar vistas acordadas y navegación; sustituir respuestas simuladas por integración real y verificar errores y accesibilidad. |
| P07–P08 | Agregar esquema y API mínima de casos; integrar consulta y seguimiento en frontend; incorporar únicamente acciones o cambios de estado aprobados, con pruebas. |
| P09–P10 | Implementar el contrato mínimo del canal; conectar backend e interfaz; verificar permisos, conservación de información y recuperación ante fallos según el canal. |
| P11 | Validar rutas y proxy en entorno controlado; resolver servicio del frontend y HTTPS del entorno; comprobar imágenes, certificados y ausencia de secretos. |
| P12–P13 | Validar cada recorrido incluido; resolver fallos con sus autores; cerrar documentación y evidencias de la entrega, dejando explícito lo pendiente. |

## 8. Criterios de aceptación y pruebas

Cada entrega debe registrar versión o revisión evaluada, entorno, procedimiento o comando, resultado real y pendientes. No se exige TDD estricto ni un porcentaje arbitrario de cobertura. Las decisiones sin aprobar y las pruebas sin ejecutar no cuentan como evidencia.

| Tarea | Criterio de aceptación y verificación |
| --- | --- |
| P01 | Alcance, decisiones, riesgos y compatibilidad documentados y revisados; ninguna instalación apoyada en versiones supuestas. Distinguir comprobaciones documentales de pruebas efectivas. |
| P02 | Esquema y contratos revisados mediante ejemplos válidos e inválidos; campos, estados HTTP y reglas de acceso sin contradicciones. Toda diferencia respecto del comportamiento actual tiene justificación y aprobación. |
| P03 | Homero reproduce preparación y limpieza con datos ficticios desde un entorno limpio, dejando instrucciones para otro integrante. Configuración ausente o destino no autorizado impiden iniciar pruebas destructivas; los recursos se identifican y aíslan. |
| P04 | Crear, listar y obtener por ID conserva rutas y estructura; los datos permanecen tras reiniciar el backend. Probar migración en base vacía y ejecución posterior sin duplicar cambios, concurrencia sin IDs duplicados, validación previa a inserción, fallos de conexión y respuestas sin secretos. Ensayar recuperación de migraciones solo en entorno descartable. Registrar por separado evidencia local y Supabase: ambos hitos son necesarios para cerrar P04. |
| P05 | Probar flujos aprobados de identidad, sesión inválida y accesos sin permiso. Dos clientes ficticios y un representante permiten comprobar pertenencia y alcance acordado. La API impide accesos indebidos aunque se omita el frontend. |
| P06 | Probar estados de sesión, errores de red y respuestas inválidas, conservación de datos apropiada y navegación por teclado. Comprobar acceso real mediante P05; ocultar una vista no sustituye controles del servidor. |
| P07 | Probar relaciones, consultas y acciones aprobadas sobre casos; inexistentes, entradas inválidas, operaciones no permitidas y acceso cruzado. Comprobar persistencia e integridad en PostgreSQL. |
| P08 | Probar carga, vacío, error y actualización según las acciones aprobadas; contrastar la información mostrada con P07 y verificar accesibilidad manual de las pantallas nuevas. |
| P09 | Participantes autorizados pueden usar el canal según D08; terceros no acceden. Probar entradas inválidas, asociación al contexto cuando corresponda y fallos sin comunicar éxito ficticio. |
| P10 | Probar envío/recepción según el canal aprobado, estados pendientes y de error, conservación de entradas y acceso mediante teclado; verificar intercambio real entre identidades ficticias autorizadas. |
| P11 | Validar configuración, proxy API, acceso directo a rutas React, destino del navegador y CORS cuando aplique. Comprobar HTTPS y confianza del certificado según D09, sin omitir validación TLS para declarar éxito. Ejecutar verificaciones de exclusiones e imágenes adaptadas a los cambios. |
| P12 | Ejecutar recorridos reales de la entrega, reinicio del backend, fallos de servicios y configuración alternativa acordada. Los recorridos con respuestas simuladas se identifican por separado. Usar herramientas existentes o aprobar cualquier herramienta adicional. |
| P13 | Revisar evidencia de P12 y de cada autor; completar regresión, tipos, lint y build aplicables. Documentación ejecutable por otro integrante, riesgos y pendientes explícitos; sin afirmar cierre global si quedan tareas o revisiones requeridas. |

**Cierre de P03 — 15 de noviembre de 2026.** Homero aprobó formalmente la tarea después de la implementación supervisada y su revisión final. Referencia evaluada: `2f89d4c`, en `feature/persistencia-consultas`, con Docker Desktop y contenedores Linux sobre Windows. Instrucciones en [README](../README.md#postgresql-local-para-desarrollo-y-pruebas-p03); verificaciones en `scripts/postgres.mjs` y `scripts/postgres.test.mjs`.

- PostgreSQL 17.12 fijado por digest: arranque, conexiones autenticadas de los tres roles, persistencia del entorno de desarrollo tras reiniciar y aislamiento de la instancia de pruebas comprobados con datos sintéticos. Puertos limitados a `127.0.0.1`; claves privadas excluidas de Git. Migrador con DDL en `app`; aplicación con conexión y uso del esquema, sin DDL ni concesiones globales sobre tablas futuras.
- Limpieza comprobada durante la implementación: solo proyectos nuevos con UUID, nombres y etiquetas verificados; recursos preexistentes preservados. Las pruebas cubren configuración ausente, destinos y recursos ajenos. La revisión final validó ambos Compose y revisó estas protecciones sin repetir limpiezas de volúmenes. Las imágenes de frontend/backend construyeron y arrancaron correctamente, con comprobación HTTP del flujo existente.
- Pruebas aprobadas en la revisión final: **29 de P03, 229 del backend y 66 del frontend**; typecheck backend, lint y build frontend correctos. El primer intento del backend falló por una restricción del entorno Windows; el mismo comando pasó fuera del entorno restringido. El backend no dispone de lint/build y el frontend no dispone de typecheck. Esta actualización documental registra esos resultados sin reejecutar pruebas.

**Límite histórico del cierre de P03:** preparó infraestructura y el esquema vacío `app`; en ese momento no había tablas de negocio, Sequelize, migraciones ejecutables ni persistencia funcional de formularios. El cierre no acreditó P04.

**Cierre técnico de P04 — 18 de noviembre de 2026.** P04.1 (contrato asíncrono), P04.2 (Sequelize/Umzug), P04.3 (API local) y P04.4a (perfiles y TLS, con regresión PostgreSQL local posterior) fueron revisadas. Homero confirmó y aprobó formalmente P04.4b en esta fecha. La evidencia remota siguiente fue aportada por el usuario; Codex no abrió conexiones ni repitió operaciones durante esta actualización documental. La [guía de persistencia](../backend/database/README.md) conserva los procedimientos y la evidencia detallada.

| Criterio de P04 | Evidencia y entorno |
| --- | --- |
| Contrato asíncrono; creación, listado y búsqueda por ID conservan rutas/JSON | Código y regresión local de P04.1/P04.3; 288 pruebas backend y typecheck aprobados en la revisión previa. |
| Migración en base vacía, repetición sin duplicados y recuperación controlada | 8 pruebas/subpruebas de migraciones locales aprobadas, con ensayo de fallo y rollback exclusivamente descartable. En Supabase se confirmó la primera ejecución de `001-crear-consultas` y su historial; no se afirma una segunda ejecución remota. |
| Concurrencia sin IDs duplicados, validación previa, fallos y errores sin secretos | 12 pruebas/subpruebas de API con PostgreSQL local aprobadas, más regresión backend. No se trasladan las pruebas negativas ni las limpiezas a Supabase. |
| Aislamiento de destinos y conservación del entorno local | 17 pruebas de configuración/TLS y 33 de protección aprobadas. La regresión local `test:postgres --limpiar` pasó incluso con variables remotas ficticias en el proceso padre y conservó los recursos preexistentes. |
| Validación real Supabase y persistencia | Evidencia de Homero: PostgreSQL 17.12 en proyecto exclusivo de desarrollo, Session pooler/5432 y TLS verificado; roles independientes, esquema `app` del migrador, objetos e historial verificados. GET inicialmente vacío, envío desde React de un formulario ficticio, ID 1 comprobado por HTTP/SQL Editor y permanencia tras detener y reiniciar únicamente Express local. |

Los criterios quedan cubiertos por la regresión local y el hito remoto real, sin atribuir a Supabase pruebas locales ni comprobaciones remotas no informadas. **P04 está técnicamente completada.** Data API desactivada, SSL obligatorio y aplicación sin UPDATE, DELETE, CREATE ni acceso al historial, según la comprobación del usuario. La base comenzó vacía; el ID 1 corresponde a una demostración explícita, no a un seed automático. Una base remota operativa no es un despliegue público: React/Express permanecieron locales y siguen pendientes autenticación, autorización funcional y despliegue. P01/P02 y P12/P13 no se cierran.

En P04 no se exigirá una secuencia de IDs sin huecos. El ID seguirá siendo numérico y generado por PostgreSQL. Se verificarán el contacto histórico, la base inicialmente vacía y los rechazos HTTP 400 de NUL/Unicode mal formado antes de insertar, sin registros añadidos ni alteración silenciosa de textos. Los demás comportamientos válidos se conservan. Los cambios intencionales de memoria volátil a persistencia requieren actualizar las pruebas afectadas, manteniendo el aislamiento unitario y el orden de listado acordado. No se añaden formatos nuevos de DNI o teléfono sin aprobación.

Comandos actuales para la regresión, a revalidar si cambian los scripts:

```text
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
node --test scripts/verificar-docker.test.mjs
node scripts/verificar-docker.mjs --modo contexto
node scripts/verificar-docker.mjs --modo imagenes
```

Las comprobaciones Docker requieren motor, Buildx y herramientas compatibles. P03 incorpora `node --test scripts/postgres.test.mjs` y `node scripts/postgres.mjs verificar --limpiar`; este último crea instancias aisladas y limpia solo sus recursos nuevos identificados. P04.2/P04.3 incorporaron migraciones e integración PostgreSQL local (`pnpm --dir backend test:postgres`), exclusivamente sobre instancias descartables propias. P04.4a añade pruebas de perfiles y TLS a la suite normal, sin conexión remota. El comando backend enumera archivos de prueba explícitamente; agregar pruebas exige incorporarlas al comando apropiado y verificar que se ejecutan. No existe un script backend de lint o build que pueda darse por disponible.

Las pruebas automáticas de accesibilidad no sustituyen una revisión con navegador y lector reales. Cada nueva interfaz debe contar con evidencia manual del flujo afectado, identificando quién la realizó; los datos serán siempre ficticios.

## 9. Orden recomendado de implementación

1. Revisar los acuerdos D01–D04 y autorizar la ejecución del incremento en modo SUPERVISADO. Completar en P01 las condiciones pendientes y evaluar P02 según sus criterios, sin darla por terminada por este registro.
2. **P03 completada y aprobada:** Homero dispone del entorno local con aislamiento, fixtures y limpieza protegida, sin depender de la disponibilidad de otros integrantes. Conservar esas protecciones; la revisión formal de P01/P02 sigue pendiente.
3. **P04 técnicamente completada:** se registraron por separado la regresión local y la validación real de Supabase aprobada el 18/11/2026. Revisar formalmente P01/P02 sin repetir ni ampliar operaciones remotas por este cierre. P12/P13 mantienen sus dependencias.
4. Al aprobar D05/D06, Matías inicia P05 y Nicolás puede avanzar P06 contra su contrato. Integrar y comprobar identidad/permisos antes de continuar con datos de otros módulos.
5. Con D07, Matías desarrolla P07 mientras Nicolás desarrolla P08 tras P06. Con D08 se repite la colaboración para P09/P10, respetando la dependencia de casos si se acordó.
6. Martín puede desarrollar P11 en paralelo desde D09. Antes de cerrar P12, integrar la configuración con los módulos realmente incluidos.
7. Ejecutar P12 y P13 para cada entrega, corrigiendo fallos con sus autores y dejando las funcionalidades futuras pendientes.

P05, P07 y P09 son secuenciales para Matías; P06, P08 y P10 también para Nicolás. No se propone paralelismo ficticio entre tareas de una misma persona. El paralelismo principal ocurre entre frontend/backend y entre módulos e infraestructura.

## 10. Estrategia de ramas, integración y commits

La rama observada durante la planificación es `docs/planificacion-taller-3`; no se modifica. El equipo deberá acordar la rama base y el flujo de integración antes de desarrollar. Como propuesta, utilizar una rama por incremento desde la base acordada y Pull Requests pequeños, sin imponer cuatro commits ni una rama por persona.

- Cada commit debe tener un propósito verificable e incluir las pruebas de ese cambio. Una tarea P01–P13 puede necesitar varios commits.
- Mantener juntos manifiestos y lockfiles. Coordinar migraciones y sus consumidores; evitar estados intermedios con contratos asíncronos o HTTP incompatibles.
- Permitir desarrollo con dobles de prueba, pero no declarar una funcionalidad integrada hasta probarla contra su backend y almacenamiento reales.
- Homero revisa cambios de datos, arquitectura y contratos; cada autor conserva responsabilidad de implementación y corrección. Martín revisa infraestructura y Nicolás participa en revisiones del contrato del navegador.
- La revisión e integración deben identificar dependencias entre Pull Requests. Un incremento incompleto no debe dejar rutas accesibles sin sus controles necesarios.
- Conservar locales los archivos privados de configuración y SDD; este documento compartible no requiere publicarlos ni modificar sus exclusiones. Los commits son responsabilidad del usuario y del equipo; Codex no los ejecuta.

Ejemplos de mensajes, sujetos al contenido real del incremento:

| Incremento | Mensaje orientativo |
| --- | --- |
| Plan compartido | `docs: agregar planificación preliminar de evolución` |
| Contrato asíncrono compatible | `refactor(backend): preparar consultas para acceso asíncrono` |
| Persistencia con pruebas | `feat(backend): persistir consultas con Sequelize` |
| Cuentas y permisos aprobados | `feat(backend): incorporar acceso autorizado a consultas` |
| Interfaz aprobada | `feat(frontend): incorporar seguimiento de casos` |
| Infraestructura | `feat(infra): integrar Caddy en el entorno acordado` |
| Verificaciones conjuntas | `test: verificar el flujo integrado con persistencia` |

## 11. Riesgos y cuestiones dependientes de las consignas oficiales

| Riesgo o incertidumbre | Tratamiento y condición |
| --- | --- |
| Consignas de Taller III todavía desconocidas | Contrastar requisitos oficiales al recibirlos: funcionalidades, tecnologías obligatorias, patrones, entregables y fechas. Repriorizar antes de comprometer trabajo adicional. |
| Persistir datos en un sistema sin controles de acceso | **Persistencia no autoriza publicación ni uso de información personal real.** Mantener datos sintéticos y entorno controlado; aprobar identidad, permisos y acceso a formularios antes de cualquier uso real. Un despliegue requerirá aprobación separada. |
| Cambiar rutas públicas al incorporar cuentas | Aprobar y documentar la transición de permisos y actualizar conjuntamente backend, frontend y pruebas. No introducir cambios silenciosos de contrato. |
| Credenciales, permisos o acceso directo a tablas | Mantener credenciales de base fuera del navegador, Git, imágenes y logs. Revisar roles y exposición de esquemas; CORS y HTTPS no sustituyen autorización. |
| Incompatibilidad de herramientas | Comprobar engines, tipos, soporte ESM y migraciones antes de instalar. No resolver incompatibilidades actualizando todo el stack sin aprobación. |
| Pruebas contra una base equivocada | Exigir destino de pruebas aprobado, datos ficticios, aislamiento y limpieza restringida. No usar una base compartida o real para pruebas destructivas. |
| IDs, orden o datos iniciales diferentes al pasar a SQL | Verificar los acuerdos D02: ID numérico generado, base vacía y contacto histórico. Cubrir las excepciones aprobadas de caracteres inválidos; no añadir restricciones de negocio inferidas de ejemplos. |
| Confundir consulta con caso o ampliar comunicación | Resolver D07/D08 antes de modelar esos módulos; no añadir estados, adjuntos, tiempo real o notificaciones por conveniencia técnica. |
| Caddy sobre imágenes de desarrollo | Separar objetivos de laboratorio y eventual entrega desplegable. Definir servicio de archivos construidos, certificados y exposición de puertos sin prometer preparación productiva. |
| Dependencias del servicio externo | Acordar entorno, permisos del equipo, conectividad y recuperación. Un fallo de Supabase no debe convertirse en pérdida silenciosa mediante fallback a memoria. |
| Homero como cuello de botella o conflictos de archivos | Revisiones concentradas en decisiones compartidas; módulos con autores definidos, contratos tempranos y cambios serializados en puntos comunes. |
| Confundir evidencia antigua con aceptación nueva | Registrar revisión evaluada y resultado; repetir verificaciones relevantes tras cambios. La revisión manual del prototipo está confirmada por el usuario; las nuevas pantallas o funcionalidades requieren evidencia propia, sin atribuir una ejecución nueva a esta actualización documental. |

Al recibir las consignas, Homero coordinará con el equipo una comparación entre cada requisito y las tareas existentes. Se conservarán P01–P13 como referencia; los cambios de alcance y criterios se registrarán con fecha, motivo y aprobación, sin marcar como ejecutado lo que solo se planificó.

## 12. Checklist general de progreso

Esta checklist evalúa tareas y verificaciones; registrar acuerdos no completa sus casillas. P03 se marca por su evidencia y aprobación formal del 15/11/2026; P04 y sus dos hitos, por la evidencia local previa y la aprobación de P04.4b del 18/11/2026, registradas en la sección 8. P01 y P02 conservan su revisión formal pendiente; D01–D04 tienen los estados de la sección 4. No se ejecutaron pruebas, implementación ni operaciones remotas en esta actualización documental.

- [ ] Los cuatro integrantes aceptaron o ajustaron la distribución propuesta y su disponibilidad.
- [ ] Se autorizó expresamente la ejecución del incremento P01–P04, además del registro de sus decisiones.
- [ ] P01: alcance mínimo, riesgos y compatibilidad revisados.
- [ ] P02: revisión del modelo y contrato aprobados completada con ejemplos y evidencia; futuras decisiones identificadas.
- [x] P03 (Homero): entorno aislado reproducido y limpieza protegida comprobada; cierre aprobado por Homero el 15/11/2026, con evidencia en la sección 8.
- [x] P04: técnicamente completada el 18/11/2026; ambos hitos acreditados, con adaptación asíncrona y regresión verificadas.
- [x] Hito local de P04: flujo PostgreSQL real y regresión comprobados.
- [x] Hito Supabase de P04: P04.4b validada realmente y aprobada por Homero el 18/11/2026, con evidencia aportada por el usuario.
- [ ] Primera entrega P01–P04 revisada mediante P12/P13 para su alcance, sin cerrar funcionalidades futuras.
- [ ] D05/D06 resueltas y alcance de cuentas/permisos autorizado.
- [ ] P05: backend de cuentas y autorización integrado y probado.
- [ ] P06: frontend de cuentas integrado y probado.
- [ ] D07 resuelta y alcance de casos autorizado.
- [ ] P07: backend de casos integrado y probado.
- [ ] P08: seguimiento frontend integrado y probado.
- [ ] D08 resuelta y alcance de comunicación autorizado.
- [ ] P09: soporte backend de comunicación integrado y probado.
- [ ] P10: interfaz de comunicación integrada y probada.
- [ ] D09 resuelta y entorno de infraestructura autorizado.
- [ ] P11: Caddy, Docker, configuración y HTTPS verificados en ese entorno.
- [ ] P12: recorridos reales, fallos y evidencias de la entrega completados.
- [ ] P13: contratos, regresión y documentación revisados; pendientes identificados.
- [ ] Revisiones manuales de accesibilidad de las nuevas pantallas registradas.
- [ ] Consignas oficiales recibidas y contrastadas con el plan; cambios aprobados.
- [ ] Confirmado que no se expusieron datos personales reales, credenciales ni archivos privados.

Para actualizar el progreso, registrar junto a la tarea o casilla la fecha, el autor, la evidencia y los bloqueos. P12/P13 deben indicar a qué entrega corresponden: cerrar el bloque de persistencia no significa cerrar toda la evolución prevista.
