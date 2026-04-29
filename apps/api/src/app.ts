import cors from "@fastify/cors";
import fastify, { type FastifyInstance } from "fastify";
import { ApiError, FixtureService } from "./fixture-service.js";

type BuildAppOptions = {
  service?: FixtureService;
  logger?: boolean;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const service = options.service ?? new FixtureService();
  const app = fastify({ logger: options.logger ?? true });

  app.register(cors, {
    origin: true
  });

  app.get("/health", async () => ({
    ok: true,
    service: "workmesh-api",
    mode: "fixture"
  }));

  app.post("/users/register", async (request) => service.registerUser(request.body ?? {}));

  app.get("/users/:wallet", async (request) => {
    const { wallet } = request.params as { wallet: string };
    return service.getUserProfile(wallet);
  });

  app.get("/gigs/search", async (request) => service.searchGigs((request.query ?? {}) as Record<string, unknown>));

  app.post("/gigs/create", async (request) => service.createGig((request.body ?? {}) as Record<string, unknown>));

  app.get("/gigs/recommended/:wallet", async (request) => {
    const { wallet } = request.params as { wallet: string };
    return service.recommendedGigs(wallet);
  });

  app.post("/match/score", async (request) => service.scoreMatch((request.body ?? {}) as Record<string, unknown>));

  app.post("/pricing/quote", async (request) =>
    service.createPriceQuote((request.body ?? {}) as Record<string, unknown>)
  );

  app.post("/messages/send", async (request) => service.sendMessage((request.body ?? {}) as Record<string, unknown>));

  app.get("/messages/thread/:id", async (request) => {
    const { id } = request.params as { id: string };
    return service.getMessageThread(id);
  });

  app.get("/levels/:wallet", async (request) => {
    const { wallet } = request.params as { wallet: string };
    return service.getLevel(wallet);
  });

  app.post("/reviews/create", async (request) => service.createReview((request.body ?? {}) as Record<string, unknown>));

  app.get("/market/signals", async () => service.getMarketSignals());

  app.get("/admin/revenue", async () => service.getAdminRevenue());

  app.get("/admin/fees", async (request) => {
    const query = request.query as { status?: unknown };
    return service.getAdminFees(query?.status);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.statusCode).send({
        error: error.message,
        details: error.details
      });
      return;
    }

    app.log.error(error);
    reply.code(500).send({
      error: "Internal server error"
    });
  });

  return app;
}
