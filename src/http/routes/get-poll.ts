import z from "zod";
import { prisma } from "../../lib/prisma";
import { FastifyInstance } from "fastify";
import { redis } from "../../lib/redis";

export async function getPoll(app: FastifyInstance) {
  app.get("/polls/:id", async (request, reply) => {
    const getPollParams = z.object({
      id: z.string().uuid(),
    });

    const { id } = getPollParams.parse(request.params);

    const poll = await prisma.poll.findUnique({
      where: {
        id: id,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!poll) {
      return reply.status(400).send({ message: "Poll not found." });
    }

    // Returns an array, in which every even position in the array is the option ID, and the following position is its score
    const result = await redis.zrange(poll.id, 0, -1, "WITHSCORES");

    const votes = result.reduce((obj, line, index) => {
      if (index % 2 === 0) {
        // Assign the score by the next position of the array
        const score = result[index + 1];

        Object.assign(obj, { [line]: Number(score) });
      }
      return obj;
    }, {} as Record<string, number>);

    return reply.send({
      poll: {
        id: poll.id,
        title: poll.title,
        options: poll.options.map((option) => {
          return {
            id: option.id,
            title: option.title,
            score: option.id in votes ? votes[option.id] : 0,
          };
        }),
      },
    });
  });
}
