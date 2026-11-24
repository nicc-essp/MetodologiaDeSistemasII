class RegisterDto {
  constructor(public nombre: string,
    public email: string,
    public password: string,
    public tipo: 'representante' | 'cliente',
  ) {}
  validate() {
    if (!this.nombre || !this.email || !this.password || !this.tipo) {
      throw new Error('Debe completar todos los datos');
    }
  }
}

export default RegisterDto;