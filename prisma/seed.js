const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        q: "What character does Matthew McConaughey play on the first season of True Detective?",
        a: "Detective Rustin 'Rust' Cohle",
        keywords: ["apina", "gorilla"]
    },
    {
        q: "What does VAE stand for in the context of deep learning?",
        a: "Variational Auto-Encoder",
        keywords: ["apina"]
    },
    {
        q: "Which year did Nelson Mandela die?",
        a: "2013",
        keywords: ["gorilla"]
    },
    {
        q: "Is JavaScript derived from Java?",
        a: "No",
        keywords: []
    },
];

async function main() {
  await prisma.like.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    }
  });

  console.log("Created user:", user.email);


  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        q: question.q,
        a: question.a,
        userId: user.id,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        }
      },
    });
  }
  // token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc3Njc3MjYxNywiZXhwIjoxNzc2Nzc2MjE3fQ.rNhdBvvWh12InRufQP7okUBwIizEWHlyizap_ZDjtfY

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());