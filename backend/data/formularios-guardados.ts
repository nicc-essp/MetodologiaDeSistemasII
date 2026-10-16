// Se guardan los formularios en formato JSON en un array
export const formulariosGuardados: string[] = [];

// Carga de prueba para el get
formulariosGuardados.push(
    JSON.stringify({
        id: 1,
        nombre: "Pepe",
        apellido: "Argento",
        dni: "123456789",
        telefono: "123456789",
        email: "pepe.argento@example.com",
        asunto: "Asunto del formulario",
        mensaje: "Mensaje del formulario",
    })
)