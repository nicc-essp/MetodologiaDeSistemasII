const API_URL = 'http://localhost:3001/formulario';

export async function crearFormulario(formulario) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formulario)
  });

  if (!response.ok) {
    throw new Error('No se pudo enviar el formulario');
  }

  return response.json();
}

export async function obtenerFormulario(id) {
  const response = await fetch(`${API_URL}/${id}`);

  if (!response.ok) {
    throw new Error('No se pudo obtener el formulario');
  }

  return response.json();
}

export async function obtenerFormularios() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('No se pudieron obtener los formularios');
  }

  return response.json();
}