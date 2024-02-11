import { FastifyInstance } from "fastify";
import { voting } from "../../utils/voting-pub-sub";
import z from "zod";

export async function pollResults(app: FastifyInstance) {
  app.get("/polls/:id/results", { websocket: true }, (connection, request) => {
    const getPollParams = z.object({
      id: z.string().uuid(),
    });

    const { id } = getPollParams.parse(request.params);

    voting.subscribe(id, (message) => {
      connection.socket.send(JSON.stringify(message));
    });
  });
}
