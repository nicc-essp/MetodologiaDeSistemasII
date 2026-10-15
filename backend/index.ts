import express from "express";
import healthRouter from "./routes/health.routes";
import formularioRouter from "./routes/formulario.routes";

const app = express();
const port = 3001;

app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.use("/health", healthRouter);
app.use("/formulario", formularioRouter);