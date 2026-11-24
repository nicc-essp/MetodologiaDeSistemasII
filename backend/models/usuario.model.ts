class Usuario {
  constructor(
    public id: number,
    public nombre: string,
    public email: string,
    public password: string,
    public tipo: 'representante' | 'cliente',
  ) {}
}

export default Usuario;