const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");

async function isOwner (req, res, next) {
    const id = Number(req.params.questionId);
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundError("User not found");
    }

    if (question.userId !== req.user.userId) {
      throw new ForbiddenError("You can only modify your own questions.");
    }

    // Attach the record to the request so the route handler can reuse it
    req.resource = question;
    next();
  
}

module.exports = isOwner;