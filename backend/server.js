// @ts-check

const Fastify = require("fastify");
const { hwrSearch } = require("./hwrSearch");

const fastify = Fastify({
  logger: true,
});
fastify.register(require("@fastify/formbody"));

fastify.all("/*", hwrSearch);

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
