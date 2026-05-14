import mongoose from "mongoose";

const connectWithRetry = async ({
  uri,
  opts = {},
  maxRetries = 5,
  baseDelayMs = 500,
  maxDelayMs = 30000
}) => {
  let attempt = 0;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (attempt <= maxRetries) {
    try {
      attempt += 1;
      console.log(`MongoDB connect attempt ${attempt} of ${maxRetries + 1}`);
      await mongoose.connect(uri, opts);
      console.log("✅ Conectado a MongoDB Atlas");
      return mongoose.connection;
    } catch (err) {
      const isLast = attempt > maxRetries;
      // Exponential backoff with full jitter
      const expDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.floor(Math.random() * expDelay);
      console.error(`MongoDB connect failed (attempt ${attempt}):`, err.message);
      if (isLast) {
        console.error("❌ Máximo de reintentos alcanzado. No se pudo conectar a MongoDB.");
        throw err;
      }
      console.log(`Reintentando en ${jitter} ms...`);
      await sleep(jitter);
    }
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI no está definida en las variables de entorno.");
    process.exit(1);
  }

  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
  };

  // Llamada con reintentos
  await connectWithRetry({ uri, opts, maxRetries: 6, baseDelayMs: 500, maxDelayMs: 20000 });

  // Listeners y cierre ordenado (opcional, mantener como en tu versión mejorada)
  mongoose.connection.on("connected", () => console.log("MongoDB connection: connected"));
  mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err));
  mongoose.connection.on("disconnected", () => console.warn("MongoDB connection: disconnected"));

  const gracefulExit = async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", gracefulExit);
  process.on("SIGTERM", gracefulExit);
};

export default connectDB;
export { mongoose };

