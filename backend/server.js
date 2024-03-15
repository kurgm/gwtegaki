// @ts-check

const Fastify = require("fastify");
const { hwrSearch } = require("./hwrSearch");

const fastify = Fastify({
  logger: true,
});
fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/cors"), {
  origin: "*",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
  maxAge: 3600,
  preflightContinue: false,
});

fastify.post("/*", hwrSearch);

fastify.listen(
  {
    host: process.env.HOSTNAME || "localhost",
    port: +(process.env.PORT || "") || 8080,
  },
  (err) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  }
);
