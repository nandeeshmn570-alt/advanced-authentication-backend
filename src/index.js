import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { validateEnv } from "./config/env.js";

dotenv.config({
  path: "./.env",
});

async function startServer() {
  const { port } = validateEnv();
  const { app } = await import("./app.js");
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  server.on("error", (error) => {
    console.error("HTTP server failed", error);
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      server.close(async (error) => {
        if (error) {
          console.error("Failed to close HTTP server cleanly", error);
          process.exitCode = 1;
        }
        await mongoose.disconnect();
      });
    });
  }
}

startServer().catch((error) => {
  console.error("Server startup failed", error);
  process.exitCode = 1;
});
