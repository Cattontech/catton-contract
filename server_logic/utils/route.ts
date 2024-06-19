import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OpCode } from "./enum";
import Logger from "./logger";

const gameConfig: any = [];
const SERVER_STATUS = "server-status";

export async function utilsRoutes(server: FastifyInstance) {
  server.get("/healthcheck", (req, res) => {
    res.send({
      code: OpCode.Success,
      result: {
        message: "Success",
      },
    });
  });

  server.get("/time", (request, reply) => {
    reply.send({
      code: OpCode.Success,
      result: {
        time_minisecond: Date.now(),
      },
    });
  });

  server.get("/tonconnect.json", async (request, reply) => {
    return reply.send({
      url: "https://catton.tech",
      name: "Catton",
      iconUrl: "https://resources.catton.tech/logo.png",
    });
  });

  // you could implement proxy like this using static server like Nginx, Caddy, etc.
  server.get(
    "/server-status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const value = gameConfig[SERVER_STATUS];
        reply.send({
          code: 0,
          result: value,
        });
      } catch (error) {
        // Send error response
        Logger.error("Error saving game configuration:", error);
        reply.status(500).send("Internal server error.");
      }
    }
  );

  // you could implement proxy like this using static server like Nginx, Caddy, etc.
  server.post(
    "/server-status",
    {
      preHandler: [server.authenticate, server.checkAdminRole],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        gameConfig[SERVER_STATUS] = body.value;
        reply.send({
          code: 0,
          result: "Game configuration saved successfully.",
        });
      } catch (error) {
        // Send error response
        Logger.error("Error saving game configuration:", error);
        reply.status(500).send("Internal server error.");
      }
    }
  );

  Logger.info("utils routes registered");
}
