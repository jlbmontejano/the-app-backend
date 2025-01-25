import express from "express";
import userRoutes from "./routes/user.routes";
import cors from "cors";
import { configDotenv } from "dotenv";

configDotenv();
const app = express();

app.use(express.json());
app.use(cors());

app.use(userRoutes);

export default app;
