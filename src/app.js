const express = require('express');
const app = express();
const authRouter = require("./routes/auth");
const questionsRouter = require("./routes/questions");
const path = require('path');
const prisma = require("./lib/prisma");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");
const errorHandler = require("./middleware/errorHandler");
const { NotFoundError } = require('./lib/errors');

app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());

// everything under /api/questions
app.use("/api/questions", questionsRouter);
app.use("/api/auth", authRouter);

app.use(errorHandler);

app.use((req, res) => {
  throw new NotFoundError();
});


module.exports = app;