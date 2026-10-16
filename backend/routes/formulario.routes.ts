import { Router } from "express";
import {
    createFormulario,
    getFormulario,
    getFormularios
} from "../controllers/formulario.controller";

const router = Router();

router.get("/", getFormularios);
router.get("/:id", getFormulario);
router.post("/", createFormulario);

export default router;