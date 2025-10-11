// @ts-check

import Fastify from "fastify";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";

import { hwrSearch, warmup, parseQuery, InvalidVError } from "./hwrSearch.js";

const fastify = Fastify({
  logger: {
    level: "trace",
    formatters: {
      level(label) {
        return {
          severity:
            {
              trace: "DEBUG",
              debug: "DEBUG",
              info: "INFO",
              warn: "WARNING",
              error: "ERROR",
              fatal: "CRITICAL",
            }[label] || "DEFAULT",
        };
      },
    },
    messageKey: "message",
  },
});
fastify.register(formbody);
fastify.register(cors, {
  origin: "*",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
  maxAge: 3600,
  preflightContinue: false,
});

fastify.post("/warmup", async (request, reply) => {
  try {
    return await warmup();
  } catch (e) {
    request.log.error(e);
    reply.status(500).send("failed to load index");
    return reply;
  }
});

fastify.post("/", async (request, reply) => {
  if (typeof request.body !== "object" || request.body === null) {
    reply.status(400).send("invalid request");
    return reply;
  }
  const { query: queryStr, v = "1" } =
    /** @type {Record<string | number | symbol, unknown>} */ (request.body);
  request.log.debug(`query: %o`, /** @type {any} */ (queryStr));
  const query = parseQuery(queryStr);
  if (!query) {
    reply.status(400).send("invalid parameter 'query'");
    return reply;
  }
  try {
    return await hwrSearch(v, query);
  } catch (e) {
    if (e instanceof InvalidVError) {
      reply.status(404).send(e.message);
      return reply;
    }
    request.log.error(e);
    reply.status(500).send("search error");
    return reply;
  }
});

try {
  await fastify.listen({
    host: process.env.HOSTNAME || "localhost",
    port: +(process.env.PORT || "") || 8080,
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
