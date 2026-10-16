import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.routes";
import formularioRouter from "./routes/formulario.routes";

const app = express();
const port = 3001;

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.use("/health", healthRouter);
app.use("/formulario", formularioRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});