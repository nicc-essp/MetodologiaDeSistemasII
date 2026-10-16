import { Request, Response } from "express";
import { Formulario } from "../models/formulario";
import { formulariosGuardados } from "../data/formularios-guardados";

function obtenerFormulariosGuardados(): Formulario[] {
    return formulariosGuardados.map(
        formulario => JSON.parse(formulario) as Formulario
    );
}

export async function getFormularios(
    req: Request,
    res: Response
): Promise<Response> {
    const formularios = obtenerFormulariosGuardados();

    return res.status(200).json(formularios);
}

export async function getFormulario(
    req: Request,
    res: Response
): Promise<Response> {
    const { id } = req.params;
    const formularios = obtenerFormulariosGuardados();

    const formulario = formularios.find(
        formulario => formulario.id === Number(id)
    );

    if (!formulario) {
        return res.status(404).json({
            message: "Formulario no encontrado"
        });
    }

    return res.status(200).json(formulario);
}

export async function createFormulario(
    req: Request,
    res: Response
): Promise<Response> {
    const {
        nombre,
        apellido,
        dni,
        telefono,
        email,
        asunto,
        mensaje
    } = req.body;

    if (
        !nombre ||
        !apellido ||
        !dni ||
        !telefono ||
        !email ||
        !asunto ||
        !mensaje
    ) {
        return res.status(400).json({
            message: "Faltan campos obligatorios"
        });
    }

    const formularios = obtenerFormulariosGuardados();

    const nuevoId =
        formularios.length > 0
            ? Math.max(...formularios.map(formulario => formulario.id)) + 1
            : 1;

    const nuevoFormulario: Formulario = {
        id: nuevoId,
        nombre,
        apellido,
        dni,
        telefono,
        email,
        asunto,
        mensaje
    };

    formulariosGuardados.push(JSON.stringify(nuevoFormulario));

    return res.status(201).json(nuevoFormulario);
}