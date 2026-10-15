import { Request, Response } from "express";
import { Formulario } from "../models/formulario";
import { formulariosGuardados } from "../data/formularios-guardados";

export async function getFormulario (req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    
    const formularios = formulariosGuardados.map(formulario => JSON.parse(formulario) as Formulario); // Más adelante se usará la consulta a la base de datos;
    const formulario: Formulario | undefined = formularios.find(formulario => formulario.id === Number(id));
    if (!formulario) {
        return res.status(404).json({ message: "Formulario no encontrado" });
    }
    return res.status(200).json(formulario);
};

export async function createFormulario (req: Request, res: Response): Promise<Response> {
    throw new Error("Not implemented"); // TODO: Implementar la creación de un formulario
}