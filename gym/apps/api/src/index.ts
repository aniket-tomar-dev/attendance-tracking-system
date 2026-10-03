import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import { api } from "./routes";
import { webhook } from "./webhook";
import { AppError } from "./services";

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(
  "/api/webhook/whatsapp",
  rateLimit({ windowMs: 60_000, limit: 300 }),
  webhook,
);
app.use(express.json());
app.use("/api", api);
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError)
    return void res
      .status(400)
      .json({
        error: {
          code: "validation",
          message: err.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
      });
  if (err instanceof AppError)
    return void res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
  console.error(err);
  res
    .status(500)
    .json({ error: { code: "server", message: "Something went wrong" } });
});
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API on :${port}`));
