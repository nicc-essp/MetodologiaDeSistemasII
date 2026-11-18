# Auditoría práctica de Docker-laws — Taller III 2026

## 1. Identificación y alcance

| Dato | Referencia de esta auditoría |
| --- | --- |
| Proyecto y materia | Docker-laws; Taller III de Metodología de Sistemas II, TUP, 2026. |
| Fecha | 18 de noviembre de 2026. Todas las ejecuciones identificadas como actuales corresponden a esta fecha. |
| Rama auditada | `docs/checklist`. |
| Commit de código y documentación de partida | `ec30dc3d716f2e6a6cb0e625fc09c00fd621d421`, merge de PR #24. |
| Fuente oficial | [Consigna_Taller_III_MSII_2026.pdf](Consigna_Taller_III_MSII_2026.pdf), página 1, leída íntegramente. SHA-256: `6311ac754cc95ef3accec6cf172bf57a9c605ae4cb32673f0be363d168baabf7`. |
| Entorno comprobado | Windows, Node 22.23.4, pnpm 12.3.4, Docker 29.4.2 con motor Linux, Buildx 0.33.0 y bsdtar 3.8.9. PostgreSQL local 17.12. |
| Modificación autorizada | Únicamente este archivo. No se corrige código, README, configuraciones, dependencias ni estados P01–P13. |

Alcance exclusivamente práctico: repositorio, reproducción, documentación, funcionalidades existentes, pruebas, resultados y mejoras de calidad. No se evalúan conocimientos individuales, preguntas de las clases 8–10 ni recuperaciones personales, aunque el PDF también los menciona. El diagnóstico no sustituye la calificación de la cátedra.

La página del PDF tiene dos columnas. Se extrajeron sus 1731 operaciones de texto con las tablas Unicode embebidas, sin caracteres desconocidos, utilizando Python estándar ya instalado. No se instalaron lectores ni paquetes. Las referencias posteriores usan los títulos y viñetas de esa única página.

**Ramas y disponibilidad:**

| Referencia | Estado verificado |
| --- | --- |
| `docs/checklist` y `develop` | Mismo commit de partida; `git rev-list --left-right --count develop...HEAD` devuelve `0 0`, sin diferencias de archivos. La refactorización y persistencia están integradas en `develop`. |
| `origin/develop` | La API pública de GitHub informó el mismo SHA `ec30dc3d716f2e6a6cb0e625fc09c00fd621d421`. |
| `main` y `origin/main` | SHA `4fbeabb04667a04055d4e20ff7a81fbff4339dc1`; no contienen las incorporaciones auditadas. `main...HEAD` devuelve `3 19`: hay divergencia, no una relación lineal simple. |
| Rama predeterminada pública | GitHub informa `main`; el repositorio es público y su URL respondió HTTP 200 sin autenticación. |
| Este documento | Incorporado como archivo de trabajo nuevo en `docs/checklist`; todavía requiere revisión y commit/integración manuales. No está incluido en el SHA de partida ni en `develop` hasta integrar esta auditoría. |

Consultas públicas de solo lectura: [repositorio](https://github.com/nicc-essp/MetodologiaDeSistemasII), [metadatos](https://api.github.com/repos/nicc-essp/MetodologiaDeSistemasII) y referencias públicas de `main`/`develop`. No se ejecutó fetch ni se escribieron referencias Git.

**Límites de comprobación:** no se accedió a perfiles privados, claves reales ni Supabase. No se instalaron paquetes ni se ensayó una instalación realmente nueva. El build frontend se generó en un directorio temporal, no en `frontend/dist`. No se reconstruyeron las imágenes completas de aplicación ni se repitió una navegación manual con navegador/lector de pantalla. Las pruebas PostgreSQL y de infraestructura utilizaron únicamente fixtures sintéticos y recursos nuevos protegidos.

## 2. Resumen ejecutivo

**Diagnóstico orientativo: CON OBSERVACIONES.** Existe una base técnica suficiente para demostrar comportamientos relevantes: creación, listado y búsqueda de consultas, validación, persistencia, errores seguros y pruebas de interfaz. Las verificaciones locales finales pasaron, con **437 casos hoja únicos**; los resultados detallados y las limitaciones aparecen abajo.

La matriz desglosa **14 requisitos prácticos: 11 CUMPLIDO, 3 PARCIAL, 0 NO CUMPLIDO y 0 NO VERIFICADO**. No incluye los siete elementos expresamente no obligatorios de la sección 8. Una verificación auxiliar puede estar NO VERIFICADO aunque el requisito compuesto tenga evidencia parcial.

El principal riesgo de entrega es concreto: el clonado del README no selecciona rama y GitHub entrega `main`, donde el script backend de pruebas sigue siendo un placeholder. Quien reproduzca desde cero puede recibir una versión diferente de la auditada. No se exige utilizar `main`; sí debe identificarse la rama de entrega y hacer coherentes sus instrucciones.

También deben corregirse referencias actuales que presentan P01/P02 como pendientes, y el encabezado de ejecución sin Docker que incluye un arranque Docker de PostgreSQL. Falta repetir la preparación integral desde una copia limpia, con instalación autorizada y recorrido real de navegador. Estas observaciones no justifican implementar cuentas, casos, Caddy, CI/CD o despliegue productivo para esta convocatoria.

## 3. Checklist de requisitos oficiales

Fuente de todas las filas: PDF oficial, **página 1**. Los identificadores son estables; corresponden al desglose práctico de sus viñetas y del apartado de evidencia. CUMPLIDO describe la evidencia disponible para la versión auditada, no su integración automática en todas las ramas.

| ID | Requisito oficial | Estado | Evidencia | Acción pendiente |
| --- | --- | --- | --- | --- |
| T3-01 | Repositorio actualizado; Qué deben tener preparado, primera viñeta. | CUMPLIDO | `docs/checklist` parte del mismo SHA que `develop`; PR #21 incorpora calidad y PR #23/#24 persistencia y cierres. Historial y comparación de referencias de la sección 1. | Identificar expresamente esa versión al entregar; resolver P1-01. El PDF no obliga a actualizar `main` mediante una estrategia particular. |
| T3-02 | Repositorio accesible; primera viñeta. | CUMPLIDO | URL pública HTTP 200 y metadatos GitHub `private=false`, comprobados sin credenciales. | Confirmar acceso desde el equipo/red de evaluación. |
| T3-03 | Proyecto demostrable; primera viñeta. | PARCIAL | 66 pruebas React, build correcto y API real con PostgreSQL local: 18 subpruebas. Hay evidencia histórica del flujo React/Express/Supabase en `backend/database/README.md`. | Verificar la entrega completa desde una copia limpia y un recorrido de navegador. No se reprodujo hoy todo el stack de aplicación siguiendo el README. |
| T3-04 | Documentación vigente para instalar; segunda viñeta. | PARCIAL | `README.md:89` documenta herramientas y lockfiles, pero `README.md:98` clona sin rama; GitHub selecciona `main`, que carece de las pruebas/persistencia auditadas. | Corregir ruta de reproducción y hacer un ensayo limpio autorizado; no se instaló nada durante esta auditoría. |
| T3-05 | Documentación vigente para configurar; segunda viñeta. | CUMPLIDO | `.env.example`, `frontend/.env.example`, `backend/config/`, guía de persistencia, secretos por archivo y perfiles local/Supabase. Los fixtures actuales verificaron rechazo de configuración incompleta o mezclada. | Mantener datos sintéticos y perfiles privados; no distribuir secretos. |
| T3-06 | Documentación vigente para ejecutar; segunda viñeta. | PARCIAL | README y manifiestos contienen comandos reales; ambos Compose validan. El encabezado `README.md:179` anuncia ejecución sin Docker, pero sus pasos requieren Docker; existen estados P01/P02 desactualizados en otros documentos. | Corregir P2-01/P2-02 y revalidar el recorrido de arranque. |
| T3-07 | Documentación para comprender el proyecto; segunda viñeta. | CUMPLIDO | Flujo en README; decisiones de responsabilidades, contratos y datos; modelo y migración; planificación; guía de persistencia. Las hipótesis futuras se identifican por separado. | Conservar la distinción entre antecedentes históricos y estado vigente al editar. |
| T3-08 | Tests automatizados ejecutables; tercera viñeta. | CUMPLIDO | Suites actuales de backend, frontend, scripts y PostgreSQL aprobadas; comandos, prerrequisitos y cantidades en sección 4. | Preparar Docker/Buildx/tar si se mostrarán las pruebas adicionales de infraestructura. |
| T3-09 | Comprobar al menos un comportamiento relevante; tercera viñeta. | CUMPLIDO | `backend/tests/formulario.http.test.ts:10`, `formulario.postgres.test.ts:58` y `frontend/src/App.test.jsx:7`: registrar y recuperar consultas, con capas reales o red controlada identificadas. | No presentar el mock de fetch de React como prueba de conexión real con Express. |
| T3-10 | Casos seleccionados y justificados: normales, límites o errores; cuarta viñeta. | CUMPLIDO | Diez casos existentes seleccionados en sección 5 con entradas, resultados, comandos y justificación. Este registro es un entregable nuevo de la auditoría. | Revisar e integrar manualmente este documento antes de la entrega. |
| T3-11 | Evidencia de revisión o mejora de calidad adecuada al lenguaje/proyecto; quinta viñeta. | CUMPLIDO | Commits `d6717a7`, `584b0f5`, `87f5b54`, TypeScript estricto, validación pura, inyección de almacén, pruebas y controles Docker. Comparación histórica en sección 7. | Mostrar cambios y resultados concretos, sin limitarse a enumerar herramientas. |
| T3-12 | Ubicar lo documentado y probado en el repositorio; Evidencia sobre código real. | CUMPLIDO | Rutas y ubicaciones de las secciones 4–7; código y pruebas versionados en `develop`. Este CHECKLIST permanece en la copia de trabajo hasta su integración. | Tener disponible el commit de entrega y los archivos indicados. |
| T3-13 | Ejecutar o explicar la ejecución de los tests; Evidencia sobre código real y dinámica práctica. | CUMPLIDO | Ejecuciones reales de esta auditoría y secuencia reproducible de sección 11. | Repetir la selección necesaria en el equipo de evaluación; no se evalúa aquí el desempeño individual futuro. |
| T3-14 | Interpretar resultados y limitaciones; Evidencia sobre código real. | CUMPLIDO | Secciones 4, 5 y 12 distinguen casos, subpruebas, reintentos, mocks, evidencia histórica, entorno local y comprobaciones no realizadas. | Mantener esos límites al presentar la demostración. |

Seguimiento del requisito, sin incluir mejoras no obligatorias:

- [x] T3-01 Repositorio actualizado en la rama auditada e integrado en `develop`.
- [x] T3-02 Acceso público comprobado.
- [ ] T3-03 Demostración integral desde copia limpia pendiente de verificar.
- [ ] T3-04 Instalación documentada y reproducción limpia pendientes de completar.
- [x] T3-05 Configuración documentada y controles locales verificados.
- [ ] T3-06 Corregir instrucciones/estados desactualizados de ejecución.
- [x] T3-07 Arquitectura y funcionamiento identificables en el repositorio.
- [x] T3-08 Tests automatizados ejecutables comprobados.
- [x] T3-09 Comportamientos relevantes verificados.
- [x] T3-10 Diez casos seleccionados y justificados en este documento.
- [x] T3-11 Mejoras de calidad respaldadas por código, pruebas y commits.
- [x] T3-12 Evidencias ubicadas mediante rutas concretas.
- [x] T3-13 Comandos de ejecución verificados y reproducibles.
- [x] T3-14 Resultados y limitaciones interpretados.

## 4. Inventario de pruebas automatizadas

Todos los comandos se ejecutan desde la raíz, salvo indicación expresa. Se utilizaron dependencias ya instaladas y `COREPACK_ENABLE_NETWORK=0` al invocar pnpm. Las cantidades siguientes provienen de resultados reales de esta auditoría; no son un objetivo ni una métrica de cobertura.

| Archivo o grupo | Herramienta y tipo | Cantidad real | Ejecución y dependencia | Resultado actual |
| --- | --- | --- | --- | --- |
| `backend/tests/app.config.test.ts` | node:test; unidad/configuración CORS. | 29 | `pnpm --dir backend test`; Node, pnpm y dependencias backend. | CUMPLIDO: valores válidos, delimitadores, rechazos y configuración explícita. |
| `backend/tests/app.test.ts` | node:test; composición, HTTP local y arranque. | 6 | Mismo comando; puertos efímeros en loopback, sin PostgreSQL. | CUMPLIDO: aislamiento, importación sin escucha/conexión y fallo seguro. |
| `backend/tests/database.supabase.test.ts` | node:test; perfiles, guards y TLS sintético en loopback. | 17 | Mismo comando; fixtures TLS públicos, sin Supabase. | CUMPLIDO: selección, roles, CA/nombre, errores seguros y protección de destino. |
| `backend/tests/database.test.ts` | node:test; configuración, modelo y runner sin conexión real. | 11 | Mismo comando; credenciales sintéticas temporales. | CUMPLIDO: puertos, archivos, esquema/modelo y argumentos permitidos. |
| `backend/tests/formulario.http.test.ts` | node:test + fetch; integración HTTP con memoria y dobles controlados. | 105 | Mismo comando; servidor propio y temporal. | CUMPLIDO: contratos, espera de promesas, validaciones, límite, errores y CORS. |
| `backend/tests/formulario.validation.test.ts` | node:test; unidad parametrizada. | 115 | Mismo comando; sin red. | CUMPLIDO: presencia/tipos/correo, proyección, NUL y Unicode. |
| `backend/tests/formularios-guardados.test.ts` | node:test; unidad del adaptador en memoria. | 4 | Mismo comando; instancias independientes. | CUMPLIDO: IDs, orden, copias y concurrencia en memoria. |
| `backend/tests/typecheck.test.ts` | node:test + tsc; comprobación estática positiva/negativa. | 1 | Mismo comando; copia temporal, tsc instalado y junction temporal en Windows. | CUMPLIDO: configuración real, inclusión de fuentes y detección de TS2322 sin alterar originales. |
| `frontend/src/App.test.jsx`, `config/apiConfig.test.js`, `services/formularioService.test.js`, `pages/ConsultaJuridica.test.jsx`, `pages/ConsultasRecibidas.test.jsx` | Vitest 5.1.0, jsdom 31.0.1 y Testing Library; unidades y comportamiento de interfaz con fetch controlado. | 66, en 5 archivos. | `pnpm --dir frontend test`; dependencias frontend, sin API/PG reales. | CUMPLIDO: navegación, envío/listado, estados, errores, validación de respuestas y configuración. |
| `scripts/postgres.test.mjs` | node:test; configuración, credenciales sintéticas, argumentos y protección de recursos. | 33 | `node --test scripts/postgres.test.mjs scripts/verificar-docker.test.mjs`; dependencias del segundo archivo indicadas abajo. | CUMPLIDO en ejecución final. |
| `scripts/verificar-docker.test.mjs` | node:test; unidad, archivos OCI/Docker y controles positivos/negativos con Docker real. | 32 | Mismo comando; Docker Linux, Buildx, tar y base Node disponible. Builds sintéticos scratch/Node, sin instalación de paquetes. | CUMPLIDO tras repetir fuera del entorno restringido. |
| `backend/tests/database.integration.test.ts` | node:test, Sequelize/pg y PostgreSQL real descartable. | 7 subpruebas + 1 contenedor; Node informa 8. | `pnpm --dir backend test:postgres --limpiar`; Docker y PostgreSQL fijado, credenciales nuevas temporales. | CUMPLIDO: roles, rollback, esquema exacto, migración repetible, modelo y permisos. |
| `backend/tests/formulario.postgres.test.ts` | node:test + fetch; API real sobre PostgreSQL descartable independiente. | 11 subpruebas + 1 contenedor; Node informa 12. | Mismo runner; otro proyecto/base nuevos. No ejecutar directamente contra una base elegida. | CUMPLIDO: contratos, concurrencia, rechazos, persistencia tras recrear Express, fallos y cierre. |

**Conteo sin duplicaciones:** backend normal 288 + frontend 66 + scripts 65 + subpruebas PostgreSQL 18 = **437 casos hoja únicos**. Los reportes PG incluyen además dos casos contenedores: al sumar literalmente las cifras de las herramientas se obtienen 439 nodos/resultados, no 439 casos hoja. No hay subpruebas anidadas en los 288 resultados del backend normal. Los tests dinámicos parametrizados se cuentan por las ejecuciones que reporta cada runner.

El primer intento de scripts informó 65 resultados: 59 aprobados y 6 fallidos por acceso denegado a Docker/Buildx en el entorno restringido. La repetición autorizada informó 65/65 aprobados. **No se suman ambos intentos como 130 pruebas diferentes.** Los mensajes iniciales no demuestran una regresión del código. Tampoco se multiplican casos por cantidad de requests, fixtures, aserciones, ejecuciones internas de tsc o las 8 inserciones concurrentes de una subprueba.

Herramientas realmente utilizadas y forma de comprobar su aporte:

| Herramienta | Aporte concreto | Comprobación |
| --- | --- | --- |
| Node, node:test, assert y fetch | Ejecutar pruebas, aserciones y HTTP local sin otro runner backend. | E-01/E-03/E-08; archivos de la tabla anterior. |
| TypeScript, tsc y tsx | Verificación estática y ejecución del backend TypeScript/ESM. | `backend/tsconfig.json`, E-04 y prueba negativa C-10. |
| Vitest, jsdom y Testing Library | Interfaz React, DOM, nombres accesibles, teclado y respuestas controladas. | E-02 y `frontend/src/test/setup.js`; no equivalen a navegador real. |
| ESLint y Vite | Reglas estáticas del frontend y construcción de sus recursos. | `frontend/eslint.config.js`, E-05/E-06. |
| pnpm y lockfiles | Versiones resueltas y comandos de cada componente. | Manifiestos/lockfiles y pnpm 12.3.4 usado en E-01/E-02/E-04/E-05/E-06/E-08. Instalación limpia todavía no comprobada. |
| Docker, Compose, Buildx y tar | PostgreSQL descartable, validación de orquestación y examen de contextos/capas. | E-03 y E-07–E-11; no se denominan pipeline CI/CD. |
| PostgreSQL, Sequelize, pg y Umzug | Persistencia, acceso mediante el modelo TypeScript y cambios de esquema versionados. | E-08/E-09, modelo, migración y runner. |
| Git y GitHub | Rastrear diferencias, integraciones y revisión pública disponible. | Historial y referencias de sección 1, comparación de commits de sección 7. Sin operaciones Git de escritura. |

Python estándar se utilizó exclusivamente como herramienta de esta auditoría para leer el PDF; no es una dependencia del proyecto ni una propuesta de incorporación.

Registro de ejecuciones y verificaciones auxiliares — todas del 18/11/2026:

| ID de ejecución | Comando o procedimiento | Resultado real y alcance |
| --- | --- | --- |
| E-01 | `pnpm --dir backend test` | Exit 0; 288/288, sin PostgreSQL activo al iniciar la auditoría. |
| E-02 | `pnpm --dir frontend test` | Exit 0; 66/66, 5 archivos. |
| E-03 | `node --test scripts/postgres.test.mjs scripts/verificar-docker.test.mjs` | Primer intento: exit 1, 59/65; segundo con acceso al motor: exit 0, 65/65. |
| E-04 | `pnpm --dir backend typecheck` | Exit 0; perfil estricto sin emisión. También se ejecuta dentro de E-01; no es otro caso de prueba adicional. |
| E-05 | `pnpm --dir frontend lint` | Exit 0. No existe script backend de lint ni frontend de typecheck; no se inventan comandos. |
| E-06 | Build temporal mostrado abajo | Exit 0; Vite 8.2.2, 33 módulos transformados. Aviso de salida externa sin vaciado automático, esperado. JS 266.97 kB, CSS 5.46 kB y `ballena.jpg` 25,077.14 kB; no son métricas de cobertura. |
| E-07 | `docker compose --env-file .env.example config --quiet` y `docker compose --env-file .env.example -f docker-compose.test.yml config --quiet` | Ambos exit 0. Validación de configuración; no acredita por sí sola arranque del stack completo. |
| E-08 | `pnpm --dir backend test:postgres --limpiar` | Exit 0; 8 + 12 nodos reportados, 18 subpruebas; dos instancias nuevas, sin Supabase. |
| E-09 | `node scripts/postgres.mjs verificar --limpiar` | Exit 0; PostgreSQL 17.12, autenticación, permisos, volumen después de reinicio e independencia entre dev/test sintéticos. Procedimiento con aserciones propias, sin contador de tests; no se suma a los 437. |
| E-10 | `node scripts/verificar-docker.mjs --modo contexto` | Exit 0; backend y frontend: 24 fixtures sintéticos excluidos por componente, control público conservado y cero privados detectados en los contextos exportados. Es un procedimiento adicional, no 48 tests nuevos. |
| E-11 | Comparación de inventario Docker antes/después | Idénticos contenedores, volúmenes y redes: 0 contenedores, 53 volúmenes y 3 redes. Solo se limpiaron los recursos nuevos acreditados. |
| E-12 | HTTP público y API pública de GitHub | Repositorio HTTP 200; `private=false`, default `main`, SHAs remotos coincidentes con las referencias locales consultadas. Sin autenticación ni fetch. |
| E-13 | `git diff --check`, revisión del archivo nuevo y comparación de hashes | Sin errores de espacios/formato; 12 secciones, 14 requisitos y 10 casos comprobados. Los 110 archivos previamente versionados, rama y staging permanecieron iguales. La comparación `git diff --no-index --check -- NUL docs/CHECKLIST.md` devuelve 1 por tratarse de contenido nuevo; no señala errores de whitespace. |

Build realmente utilizado, con salida nueva fuera del repositorio:

```powershell
$salida = Join-Path ([System.IO.Path]::GetTempPath()) ('docker-laws-t3-build-' + [guid]::NewGuid().ToString('N'))
pnpm --dir frontend build --outDir $salida
```

**NO VERIFICADO en esta auditoría:** instalación desde cero con lockfiles, arranque completo de imágenes de aplicación recién construidas, recorrido manual actual de navegador/Narrador y estado remoto actual de Supabase. Las razones son, respectivamente, prohibición de instalar paquetes; ausencia de reconstrucción completa que implicaría instalar dependencias dentro de imágenes; ausencia de revisión manual; y prohibición expresa de acceder a Supabase. No se ejecutó `db:status` remoto. Tampoco se realizó auditoría de vulnerabilidades de todas las dependencias transitivas.

## 5. Casos de prueba seleccionados

Los diez casos existen y fueron cubiertos por E-01, E-02 o E-08. Los comandos B/F/P ejecutan el grupo completo, incluidos esos casos; no se ejecutaron nuevamente uno por uno para inflar el conteo.

- **B:** `pnpm --dir backend test`.
- **F:** `pnpm --dir frontend test`.
- **P:** `pnpm --dir backend test:postgres --limpiar`, exclusivamente mediante el runner protegido.

| ID y clase | Archivo y ubicación | Entrada o condición | Resultado esperado y comprobado | Justificación y calidad demostrada | Ejecución |
| --- | --- | --- | --- | --- | --- |
| C-01 — Normal | `backend/tests/formulario.http.test.ts:10` | Siete campos ficticios válidos; `id` y propiedad extra enviados por el cliente. | POST 201 con ID del servidor; GET de colección/detalle 200; extras ignorados; siguiente ID y orden conservados. | Recorre un comportamiento de negocio completo y su contrato HTTP. Almacén en memoria identificado. | B, E-01. |
| C-02 — Normal | `frontend/src/App.test.jsx:7` | Navegar, completar los siete campos, enviar y abrir consultas recibidas. Fetch usa un doble que conserva los objetos enviados. | Confirmación y visualización del mismo registro, con su correo. | Integra componentes, servicios y navegación. Es red controlada en jsdom, no una conexión React/Express/PostgreSQL real. | F, E-02. |
| C-03 — Límite | `backend/tests/formulario.http.test.ts:169` | JSON cuyo tamaño es exactamente 102400 bytes y otro que lo supera. | El límite exacto devuelve 201; el exceso devuelve 413 y no agrega un formulario. | Verifica una frontera exacta y ausencia de efectos ante rechazo, no solamente un ejemplo arbitrario pequeño. | B, E-01. |
| C-04 — Error de datos | `backend/tests/formulario.postgres.test.ts:93` | NUL y sustitutos Unicode inválidos en cada campo; bytes UTF-8 inválidos. | HTTP 400 antes de insertar; registros y valor de secuencia permanecen iguales. | Relaciona validación HTTP con restricciones reales de PostgreSQL y evita éxito parcial o transformación silenciosa. | P, E-08. |
| C-05 — Límite/error de identificador | `backend/tests/formulario.postgres.test.ts:69` | IDs equivalentes válidos y valores como `abc`, Infinity, fracciones o fuera de INTEGER. | Formas históricas válidas retornan 200; inválidos/inexistentes retornan 404 sin 500 por conversión SQL. | Comprueba compatibilidad al pasar de memoria a SQL y límites numéricos. | P, E-08. |
| C-06 — Normal concurrente | `backend/tests/formulario.postgres.test.ts:82` | Ocho POST simultáneos sobre una instancia descartable. | Todos 201; IDs diferentes y colección ordenada ascendentemente. | Verifica integridad bajo concurrencia real, sin asumir una secuencia sin huecos. Los ocho requests constituyen una subprueba. | P, E-08. |
| C-07 — Error transaccional | `backend/tests/database.integration.test.ts:33` | Fallo sintético después de crear consultas dentro de la transacción. | La tabla no queda creada y no se registra la migración como exitosa; error público sin detalle privado. | Acredita rollback y tratamiento seguro en entorno descartable. No cubre una interrupción posterior al commit y anterior al historial de Umzug. | P, E-08. |
| C-08 — Normal/persistencia | `backend/tests/formulario.postgres.test.ts:112` | Crear consultas, cerrar el servidor y recrearlo con la misma base descartable. | Datos conservados y cierre idempotente. | Diferencia persistencia real de estado de proceso; no se confunde con reiniciar PostgreSQL. E-09 verifica además el reinicio del contenedor PG. | P, E-08. |
| C-09 — Error de interfaz | `frontend/src/pages/ConsultaJuridica.test.jsx:69` | Fallo de red, respuesta 500 o respuesta 201 incompatible. | Alerta segura, campos conservados y botón nuevamente operable; no se muestra el detalle interno ficticio. | Previene pérdida de trabajo y confirmaciones falsas; demuestra accesibilidad automatizada de estados. | F, E-02. |
| C-10 — Error estático controlado | `backend/tests/typecheck.test.ts:39` | Copia temporal fiel, con un TS2322 añadido en un archivo nuevo. | El comando real typecheck incluye el archivo y falla por el error esperado; la copia sana pasa y las fuentes originales no cambian. | Demuestra que el control de tipos funciona realmente y no es solo un script declarado. | B, E-01. |

Estas selecciones satisfacen el pedido de casos normales, límites y errores sin inventar pruebas ni pedir una cantidad mínima distinta de la consigna.

## 6. Auditoría de documentación

| Fuente | Evaluación y contraste con el código | Acción mínima propuesta |
| --- | --- | --- |
| `README.md` | Describe rutas, campos, configuración, PG local y Supabase. El clon de línea 98 omite rama; en GitHub cae en `main`. El título de línea 179 dice sin Docker pero arranca PostgreSQL con Compose. La referencia de línea 29 a revisión futura de P01/P02 quedó antigua. | Seleccionar rama/commit de entrega, corregir encabezado y estados. Conservar el procedimiento local y sus restricciones. |
| `docs/planificación.md` | P01–P04 cerradas con evidencia independiente; reconoce el PDF y deja adaptación posterior pendiente. P05–P13 y D05–D09 continúan sin nueva aprobación. | No modificar esas tareas en esta auditoría. Usar la consigna oficial para esta checklist, no tratar previsiones funcionales como requisitos académicos. |
| `docs/decisiones-diseno.md` | Las secciones 1–6 se identifican como antecedentes; no se consideran defectos actuales sus descripciones históricas de memoria. Sin embargo, la sección 7 conserva afirmaciones de P01/P02 pendientes que ya contradicen la planificación. | Actualizar las referencias de estado vigentes, preservando antecedentes fechados. |
| `docs/discusion-tecnica.md` | Material exploratorio del 14/11, expresamente no aprobado. El DER de seis entidades, sus FK/cardinalidades y propuestas iniciales no son el modelo implementado. | Mantenerlo como antecedente; una nota hacia el registro aprobado ayudaría, pero no requiere implementar ese DER. |
| `backend/database/README.md` | Buena separación de perfiles, roles, TLS, migraciones, riesgos, pruebas locales e informe remoto del usuario. Conserva referencias a P01/P02 pendientes al comienzo y al cierre. | Corregir esos estados. No extrapolar la validación Session pooler a conexión directa ni a otro proyecto. |
| `frontend/README.md` | Plantilla de Vite, no manual del proyecto. No invalida por sí sola la documentación central, pero puede desorientar. | Enlace breve al README central o adaptación mínima, opcional. |
| Manifiestos, lockfiles, `.env.example`, Dockerfiles y Compose | Scripts reales y versiones declaradas localizables; archivos privados excluidos; inicializador requiere volumen vacío y no rota claves de un volumen existente. La imagen PG está fijada por digest; Node usa etiqueta mutable `node:22-alpine`. | Documentar prerrequisitos de red/caché y la reproducción limpia; no borrar volúmenes para resolver credenciales. Fijar Node por digest sería mejora opcional. |

Flujo comprobado por inspección: React → `frontend/src/services/formularioService.js` → rutas/controlador Express → validación → contrato asíncrono de almacén → Sequelize → `app.consultas` → DTO público → React. `createApp()` permite memoria para pruebas; el arranque normal de `backend/index.ts` exige PG y no realiza migraciones automáticas ni fallback. La base comienza vacía salvo demostración explícita; la memoria de pruebas conserva un seed histórico y no debe confundirse con el arranque persistente.

El esquema físico coincide con D02: ID INTEGER autogenerado y PK, siete TEXT NOT NULL, sin timestamps ni FK de entidades futuras. No se impusieron formatos nacionales de DNI/teléfono. NOT NULL no reemplaza las validaciones de blancos/correo del backend. El frontend conserva ID numérico y siete textos; proyecta errores a mensajes seguros. Los contratos existentes tienen pruebas de compatibilidad.

## 7. Evidencia de calidad y mejoras

La referencia anterior a la refactorización es `4fbeabb`, no una reconstrucción supuesta. Se inspeccionaron sus archivos con `git show`: el controlador parseaba strings JSON del arreglo, validaba, calculaba IDs y serializaba al almacenar; `backend/package.json` declaraba un test placeholder que termina con exit 1.

| Mejora verificada | Código y evidencia actuales | Commit o antecedente comprobable | Valor y límite |
| --- | --- | --- | --- |
| Separación de responsabilidades | `backend/controllers/formulario.controller.ts`, `validations/formulario.validation.ts`, `data/`, router y middleware; E-01. | `d6717a7`; comparación con controlador de `4fbeabb`. | Separa transporte, validación y almacenamiento. No se afirma un patrón GoF obligatorio. |
| Eliminación de JSON interno innecesario | `backend/data/formularios-guardados.ts`; cuatro pruebas de copias/aislamiento. | `d6717a7`. | Objetos privados por instancia; JSON permanece en HTTP. Memoria es solo adaptador de pruebas. |
| Comprobación de tipos efectiva | `backend/tsconfig.json`, script typecheck y prueba negativa C-10. | `d6717a7`. | Strict y noEmit, sin ocultar errores con skipLibCheck. No implica tipado del frontend JavaScript. |
| Validación antes de producir efectos | `backend/validations/formulario.validation.ts`, `backend/app.ts`; 115 casos de validador y pruebas HTTP/PG. | `d6717a7`, ampliación en `6ae4d2f`. | Tipos, blancos, correo, tamaño, NUL/Unicode/UTF-8; no acredita todas las reglas jurídicas posibles. |
| Errores seguros y consistentes | `backend/middleware/error.middleware.ts`, servicio frontend; C-04/C-09 y errores SQL reales. | `d6717a7`, `584b0f5`, `6ae4d2f`. | Evita filtrar cuerpos/SQL/detalles en respuestas; no es una auditoría universal de seguridad. |
| Testabilidad y aislamiento | `createApp`, helpers HTTP, inyección del almacén y fixtures; E-01/E-08. | `d6717a7`, `29056c4`. | Tests con memoria y adaptador PG separado; importación sin arrancar servicios. |
| Interfaz comprobable y accesible | Labels, status/alert, bloqueo durante envío y conservación ante error; 66 tests React. | `584b0f5`. | jsdom comprueba comportamiento, no sustituye un lector de pantalla real. |
| Protección Docker automatizada | `.dockerignore`, verificador e inspector de capas OCI/Docker; E-03/E-10. | `87f5b54`, adaptación posterior de contextos. | Controles positivos detectan fugas sintéticas y capas anteriores; no es detector universal de secretos. |
| Persistencia y cambios de esquema controlados | Modelo, migración, roles y runner; E-08/E-09. | `2f89d4c`, `bff5842`, `6ae4d2f`. | Conserva datos y separa DDL de la aplicación. El historial Umzug se escribe después del commit de la migración. |
| Configuración remota que falla de forma explícita | `backend/config/database.config.ts`, `connection.ts`, guards del runner; 17 tests y evidencia remota documentada. | `30fe95c`, registro `4ff4e42`. | TLS verifica CA/nombre, no hay fallback de destino. Las pruebas sintéticas no acreditan disponibilidad remota actual. |
| Trazabilidad documental | README, decisiones, guía y cierre P01/P02 en planificación. | `eed0325`, `4ff4e42`, `e6ffbdd`. | Hay antecedentes y evidencias concretas; las referencias desactualizadas detectadas requieren mantenimiento. |

No se atribuye esta mejora a CI, a métricas de cobertura inexistentes ni al solo hecho de usar un ORM. No se midió complejidad ciclomática ni se ejecutó un análisis SonarQube.

## 8. Infraestructura y aportes adicionales

El PDF, p. 1, Qué NO es obligatorio, separa estas decisiones de los mínimos prácticos. No se añaden a la checklist de pendientes de la sección 3:

| Elemento | Estado | Lectura correcta de la consigna |
| --- | --- | --- |
| GitHub Actions | NO OBLIGATORIO | No hay workflows versionados; su ausencia no incumple el taller. |
| Pipelines CI/CD | NO OBLIGATORIO | Los scripts locales aportan automatización; no se presentan como un pipeline CI/CD. |
| SonarQube | NO OBLIGATORIO | Typecheck, lint, pruebas y revisión de cambios son evidencias adecuadas al proyecto. |
| Despliegue e infraestructura productiva | NO OBLIGATORIO | Se puede demostrar localmente. Una base alojada no equivale al despliegue de React/Express. |
| Porcentaje específico de cobertura | NO OBLIGATORIO | No se midió cobertura; no se infiere de 437 casos ni se impone un umbral. |
| Cantidad determinada de tests | NO OBLIGATORIO | Debe existir al menos un comportamiento relevante verificado, no un número arbitrario. |
| Framework particular | NO OBLIGATORIO | node:test y Vitest son elecciones del proyecto, no exigencias del PDF. |

| Aporte adicional | Estado de verificación actual | Evidencia y límite |
| --- | --- | --- |
| PostgreSQL local reproducible y aislamiento | CUMPLIDO | E-08/E-09 con instancia nueva, imagen 17.12 por digest, volumen tras reinicio y bases independientes. |
| Docker Compose y secretos por archivo | CUMPLIDO | Ambos config validan; las verificaciones solo generan claves sintéticas nuevas. No se leyeron secretos del desarrollo habitual. |
| Sequelize y Umzug | CUMPLIDO | Modelo/migración, historial `app."SequelizeMeta"`, segunda ejecución local sin duplicación y permisos de aplicación comprobados. |
| Separación aplicación/migrador | CUMPLIDO | Aplicación sin DDL, UPDATE/DELETE ni acceso al historial en tests locales; no usa administrador para el funcionamiento normal. |
| Exclusiones de contextos y detector de imágenes | CUMPLIDO | E-10: 24 fixtures por componente; E-03 incluye imágenes sintéticas con fugas deliberadas y examen de capas/procedencia. No se reconstruyeron hoy las imágenes completas de aplicación. |
| TLS de perfiles y barreras de destino | CUMPLIDO | 17 tests locales, CA/nombre correctos y rechazos; tests PG fuerzan local. Los certificados/clave versionados de `backend/tests/fixtures/tls-local/` son públicos y sintéticos, explícitamente no productivos. |
| Disponibilidad, roles y persistencia de Supabase hoy | NO VERIFICADO | Prohibido conectar durante esta auditoría. Hay evidencia histórica de Homero del 18/11 en `backend/database/README.md:171`: Session pooler/5432, TLS, migración, ID 1 y persistencia tras reiniciar Express. Se conserva como evidencia aportada, no como comprobación remota del auditor. |
| Revisión manual de accesibilidad actual | NO VERIFICADO | README registra revisión previa del usuario con Chrome/Narrador en Windows 10. No se repitió hoy ni se declara conformidad completa con una norma. |

La aplicación sigue sin autenticación y autorización funcional de clientes. La Data API desactivada y el SSL obligatorio de Supabase son estados históricos confirmados por el usuario; no se consultaron nuevamente. Los roles técnicos no implementan separación por cliente. Usar solo datos ficticios y acceso controlado; no publicar información personal real. Tampoco está implementado el seguimiento de casos o la comunicación con representantes; su ausencia no es un incumplimiento de este PDF.

## 9. Problemas detectados y prioridades

Las soluciones son propuestas para revisión, no cambios ejecutados ni nuevas tareas P01–P13. El esfuerzo es una estimación relativa, no tiempo medido.

### P1 — Bloqueantes

| ID | Evidencia e impacto | Solución mínima propuesta y archivos | Esfuerzo/dependencias |
| --- | --- | --- | --- |
| P1-01 — Reproducción por defecto apunta a otra versión | Default público `main=4fbeabb`; `README.md:98` no selecciona rama. En `main`, `backend/package.json` contiene test placeholder con exit 1 y Compose no incluye PG. Bloquea reproducir por defecto la entrega auditada, aunque el código en `develop` funciona. | Elegir y comunicar rama/commit de entrega; corregir el clonado del README, por ejemplo con `--branch develop`, o integrar mediante el proceso que decida el equipo. No es obligatorio fusionar a `main` para cumplir el PDF. Afecta README/instrucciones de entrega; cualquier operación Git será manual y autorizada. | Bajo para documentar; depende de decidir la referencia de entrega. |

No se detectó un bloqueante funcional en el flujo probado de la rama auditada. P1-01 es un problema de entrega/reproducción, no una justificación para reimplementar el backend.

### P2 — Importantes

| ID | Evidencia e impacto | Solución mínima propuesta y archivos | Esfuerzo/dependencias |
| --- | --- | --- | --- |
| P2-01 — Estados documentales contradictorios | `README.md:29`, sección 7 de `docs/decisiones-diseno.md` y principio/cierre de `backend/database/README.md` aún dejan P01/P02 pendientes; `docs/planificación.md` ya registra su aprobación. Puede observarse falta de documentación vigente. | Ajustar solo referencias actuales de estado, conservando antecedentes y evidencias. No reabrir ni volver a cerrar tareas. | Bajo; aprobación de edición de esos documentos. |
| P2-02 — Ejecución sin Docker requiere Docker | `README.md:179` y bloque backend con `docker compose up`. Un equipo que siga ese encabezado sin Docker no podrá arrancar como se anuncia. | Renombrar a ejecución local de frontend/backend con PostgreSQL en Docker y explicitar prerrequisitos; no introducir otro modo de infraestructura. | Bajo; README. |
| P2-03 — Reproducción limpia integral no verificada | Esta auditoría reutiliza dependencias instaladas y prueba capas por separado; no instala ni reconstruye el stack completo ni realiza un recorrido manual nuevo. No hay resultado actual de copia limpia. | Tras autorizarlo, ensayar rama elegida en una copia nueva, instalación frozen-lockfile, entorno local propio y flujo React/Express/PG. Registrar fallos y resultados reales. | Medio; P1-01, herramientas/red disponibles y autorización de instalación/recursos nuevos. |
| P2-04 — Auditoría nueva pendiente de integrar | Este CHECKLIST es nuevo y no pertenece al SHA auditado de `develop`; de otro modo, los casos seleccionados y el diagnóstico quedarían solo en una copia local. | Revisar, hacer commit e integrar manualmente este documento con el flujo del equipo. No ejecutar esas operaciones durante esta auditoría. | Bajo; revisión del usuario y proceso Git del equipo. |

### P3 — Opcionales

| ID | Evidencia e impacto | Solución mínima propuesta y archivos | Esfuerzo/dependencias |
| --- | --- | --- | --- |
| P3-01 — Imagen de portada desproporcionada | `frontend/src/assets/images/ballena.jpg`: 25,077,140 bytes; `Home.jsx` la muestra a 180 × 180 y el build la copia completa. Puede demorar la demostración en conexiones lentas. | Optimizar una copia y conservar apariencia/tamaño adecuados; no cambiar funcionalidades. | Bajo; archivo de imagen y autorización posterior. No es un mínimo expreso del PDF. |
| P3-02 — README interno de plantilla | `frontend/README.md` describe la plantilla Vite en vez de orientar sobre Docker-laws. | Enlazar la documentación central o reemplazar texto genérico mínimo. | Bajo; autorización documental. |
| P3-03 — Reproducibilidad de imagen Node y mantenimiento de transitivas | Dockerfiles usan etiqueta mutable; la guía ya registra transitivas deprecadas. No se acreditó una vulnerabilidad ni un fallo de instalación actual. | Evaluar fijación de imagen y revisión específica de dependencias cuando corresponda, sin actualización masiva. | Bajo/medio; revisión de compatibilidad. No bloquea los mínimos del taller. |

## 10. Plan mínimo de preparación

1. **Corrección de entrega necesaria:** decidir la rama/commit que verá la cátedra y resolver P1-01. El repositorio público no debe inducir a reproducir otra versión sin advertencia.
2. **Mejoras documentales:** resolver P2-01/P2-02, preservando la distinción entre aprobado, histórico y pendiente. Revisar e integrar este CHECKLIST mediante el proceso manual del equipo.
3. **Verificación pendiente:** realizar P2-03 con autorización específica. Anotar equipo, referencia, instalación, comandos y resultados; no usar los secretos ni volúmenes habituales. Mientras no se realice, mantener T3-03/T3-04 como PARCIAL.
4. **Preparación práctica:** utilizar los casos seleccionados y el recorrido de la sección 11. Elegir una selección breve que pueda ejecutarse durante la evaluación y conservar la suite completa como respaldo.
5. **Mejoras opcionales:** optimización de portada, README interno y mantenimiento acotado. No retrasar la reproducción básica para incorporar herramientas nuevas.
6. **Trabajo innecesario para esta convocatoria:** imponer CI/CD, Actions, SonarQube, despliegue productivo, porcentajes de cobertura, nuevos frameworks o funcionalidades de cuentas/casos/mensajería como condición del taller. La consigna no los exige.

No se reorganizan P05–P13 ni se asignan responsables definitivos. Los cierres P01–P04 permanecen como estaban; esta auditoría utiliza la consigna para evaluar preparación práctica, sin reescribir retrospectivamente sus criterios.

## 11. Checklist operativa para el día de evaluación

**Condiciones previas:** referencia de entrega acordada, copia local autorizada, Node 22 >=22.22.2 y pnpm 12.3.4. Para la demostración persistente: Docker Linux, puertos locales 5173/3001/5433 disponibles, proyecto de demostración propio y PostgreSQL local. Para pruebas Docker adicionales: Buildx, tar y las imágenes necesarias disponibles. Usar una terminal con configuración local, sin perfiles o variables remotas heredadas; no utilizar Supabase en este recorrido.

- [ ] Confirmar la referencia y que no haya cambios inesperados:

  ```powershell
  git branch --show-current
  git rev-parse HEAD
  git status --short
  ```

- [ ] **Preparación previa de copia nueva, pendiente de autorizar y no ejecutada en esta auditoría:** seleccionar la rama de entrega al clonar; instalar dependencias exactas. Ejemplo si el equipo elige `develop`:

  ```powershell
  git clone --branch develop https://github.com/nicc-essp/MetodologiaDeSistemasII.git
  cd MetodologiaDeSistemasII
  pnpm --dir backend install --frozen-lockfile
  pnpm --dir frontend install --frozen-lockfile
  ```

- [ ] Preparar y arrancar exclusivamente el entorno local de demostración autorizado. Estos comandos escriben su base local; no ejecutarlos sobre recursos ajenos o un perfil remoto:

  ```powershell
  node scripts/postgres.mjs preparar
  docker compose up -d --wait postgres
  pnpm --dir backend db:migrate
  docker compose up --build -d
  docker compose ps
  Invoke-RestMethod http://localhost:3001/health
  ```

  La migración es explícita y anterior al backend. El preparador no sobrescribe claves existentes; si fallan credenciales, no borrar volúmenes para repararlo. La construcción requiere acceso/caché de dependencias e imágenes; prepararla antes de la evaluación.

- [ ] Ejecutar verificaciones del código de la copia preparada:

  ```powershell
  pnpm --dir backend test
  pnpm --dir backend typecheck
  pnpm --dir frontend test
  pnpm --dir frontend lint
  pnpm --dir frontend build
  ```

- [ ] Si se mostrarán aportes de infraestructura, ejecutar únicamente los procedimientos protegidos:

  ```powershell
  node --test scripts/postgres.test.mjs scripts/verificar-docker.test.mjs
  pnpm --dir backend test:postgres --limpiar
  node scripts/verificar-docker.mjs --modo contexto
  ```

  Las suites de scripts incluyen Docker real; no presentarlas como independientes del motor. `--limpiar` solo se admite para recursos nuevos acreditados del runner. Nunca añadir `prune`, limpiezas de bases compartidas ni borrado de volúmenes de desarrollo.

- [ ] Abrir `http://localhost:5173`, enviar una consulta claramente ficticia y comprobarla en consultas recibidas. Diferenciar un listado vacío de un error. No utilizar el ejemplo como si fuera una persona real.
- [ ] Reiniciar únicamente el backend de ese entorno autorizado, volver a listar y comprobar permanencia. Mostrar un caso límite/error de la sección 5 y su salida, sin manipular la base habitual para provocar fallos.
- [ ] Ubicar en el código el controlador, validador, almacén PostgreSQL, migración y test correspondiente. Comparar una mejora histórica concreta con su commit, sin afirmar métricas no medidas.
- [ ] Mostrar las limitaciones: interfaz de desarrollo, acceso sin autenticación, evidencia Supabase histórica y cobertura no medida. Una base remota no prueba despliegue público.
- [ ] Detener el entorno cuando corresponda con `docker compose stop`, conservando su volumen. No eliminar recursos preexistentes.

Esta secuencia es operativa; no incluye preguntas teóricas ni preparación individual. Los resultados de una ejecución futura deben registrarse con fecha y referencia antes de cambiar estados de la matriz.

## 12. Conclusión y próximos pasos

**¿Cumplimos los mínimos prácticos?** El núcleo técnico de tests relevantes, casos justificables y mejoras de calidad está demostrado. La preparación global sigue **CON OBSERVACIONES**, con tres requisitos compuestos parciales por reproducción/documentación. No corresponde afirmar conformidad integral sin resolver la ruta de entrega y comprobar el recorrido limpio.

**Demostrado ahora:** acceso público, código actual integrado en `develop`, 437 casos hoja únicos aprobados, controles estáticos, build frontend, configuración Compose, migraciones y API PG locales, persistencia/aislamiento de P03 y exclusiones Docker sintéticas. El primer intento restringido de scripts falló y la repetición con acceso al motor pasó; ambos resultados quedan registrados.

**Pendiente:** rama de entrega reproducible en instrucciones, correcciones documentales, integración manual de este CHECKLIST y ensayo integral limpio con instalación autorizada/navegador. Supabase y la revisión manual de accesibilidad conservan sus evidencias históricas; no se verificaron nuevamente ni se necesitan escrituras remotas para resolver los pendientes del taller.

**Prioridad:** P1-01, P2-01/P2-02 y ensayo P2-03; después revisión/integración manual del documento. No iniciar funcionalidades nuevas para compensar defectos de documentación o reproducción.

Al finalizar la auditoría se comprobaron hashes de los archivos versionados, rama, staging e inventario Docker; no se modificaron fuentes ni otros documentos. El único archivo nuevo de trabajo autorizado es `docs/CHECKLIST.md`. No se ejecutaron operaciones de escritura de Git. Las correcciones propuestas quedan a revisión del usuario.
