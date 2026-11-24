class LoginDto {
  constructor(public email: string, public password: string) {}
  validate() {
    if (!this.email || !this.password) {
      throw new Error('Debe completar todos los datos');
    }
  }
}

export default LoginDto;