import type { Request, Response } from 'express';
import RegisterDto from '../models/register.dto';
import LoginDto from '../models/login.dto';
import { registrarUsuario, iniciarSesion } from '../services/auth.service';


export const registerUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, tipo } = req.body;
    const registerDto = new RegisterDto(nombre, email, password, tipo);
    registerDto.validate();
    const usuario = await registrarUsuario(registerDto);
    return res.status(201).json(JSON.stringify(usuario));
  } catch {
    return res.status(400).json({ message: 'Error al crear el usuario' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const loginDto = new LoginDto(email, password);
    loginDto.validate();
    const usuario = await iniciarSesion(loginDto);
    return res.status(200).json(usuario);
  }
  catch {
    return res.status(400).json({ message: 'Error al iniciar sesión' });
  }
};