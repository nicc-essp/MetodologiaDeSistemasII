import { Router } from "express";
import { createFormulario, getFormulario } from "../controllers/formulario.controller";

const router = Router();

router.get("/:id", getFormulario);
router.post("/", createFormulario);

export default router;