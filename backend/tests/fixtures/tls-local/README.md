# Material TLS público y sintético para pruebas locales

`ca.crt`, `servidor.crt` y `servidor.key` fueron generados exclusivamente para probar TLS en loopback. La clave del servidor es un fixture público, sin valor de seguridad: nunca debe utilizarse fuera de estas pruebas. No pertenece a Supabase ni acredita ninguna conexión con ese servicio. La clave de firma de la CA se descartó después de generar estos archivos.

El nombre ficticio del certificado permite probar la comprobación del servidor utilizando las mismas opciones de conexión, sin resolver DNS ni abrir conexiones remotas. La vigencia de veinte años evita depender de OpenSSL durante la ejecución de las pruebas; al vencer, deberán regenerarse los fixtures.
