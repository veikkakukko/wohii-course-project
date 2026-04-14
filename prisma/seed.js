const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        q: "What character does Matthew McConaughey play on the first season of True Detective?",
        a: "Detective Rustin 'Rust' Cohle"
    },
    {
        q: "What does VAE stand for in the context of deep learning?",
        a: "Variational Auto-Encoder"
    },
    {
        q: "Which year did Nelson Mandela die?",
        a: "2013"
    },
    {
        q: "Is JavaScript derived from Java?",
        a: "No"
    },
];

async function main() {
  await prisma.question.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        q: question.q,
        a: question.a
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());