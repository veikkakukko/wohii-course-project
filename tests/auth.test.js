const bcrypt = require("bcrypt");
import { beforeEach, it, expect, describe } from 'vitest';
const { resetDb, request, app, prisma, registerAndLogin, createQuestion } = require("./helpers");


beforeEach(resetDb);



it("registers, hashes the password, returns a token", async () => {
  const res = await request(app).post("/api/auth/register")
    .send({ email: "a@test.io", password: "pw12345", name: "A" });

  expect(res.status).toBe(201);
  expect(res.body.token).toEqual(expect.any(String));

  const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
  expect(user.password).not.toBe("pw12345");                          // not plain
  expect(await bcrypt.compare("pw12345", user.password)).toBe(true);  // valid hash
});

it("returns 403 when editing someone else's question", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const question = await createQuestion(aliceToken, { q: "Alice's question" , a: "Alice's answer"});

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/questions/${question.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ q: "What?", a: "That."});

  expect(res.status).toBe(403);

  const after = await prisma.question.findUnique({ where: { id: question.id } });
  expect(after.q).toBe("Alice's question");  // unchanged
});

it("returns 400 when registering with missing fields", async () => {
  const res = await request(app).post("/api/auth/register")
    .send({ password: "pw12345", name: "Pasi" });

  expect(res.status).toBe(400);
});

it("registering with duplicate email returns 409", async () => {
  await request(app).post("/api/auth/register")
    .send({ email: "pasi@test.com", password: "pw12345", name: "Pasi" });
  
  const res = await request(app).post("/api/auth/register")
    .send({ email: "pasi@test.com", password: "pasin_salasana", name: "Pasi" });

  expect(res.status).toBe(409);
});

it("returns 400 when logging in with missing fields", async () => {
  await request(app).post("/api/auth/register")
    .send({ email: "pasi@test.com", password: "pw12345", name: "Pasi" });
  
  const res = await request(app).post("/api/auth/login")
    .send({ email: "pasi@test.com" });

  expect(res.status).toBe(400);
});

it("returns 401 when logging in with unknown email", async () => {

  const res = await request(app).post("/api/auth/login")
    .send({ email: "pasi@test.com", password: "pw12345" });

  expect(res.status).toBe(401);
});

it("returns 401 when logging in with wrong password", async () => {

  await request(app).post("/api/auth/register")
    .send({ email: "pasi@test.com", password: "pw12345", name: "Pasi" });

  const res = await request(app).post("/api/auth/login")
    .send({ email: "pasi@test.com", password: "pasin_salasana123" });

  expect(res.status).toBe(401);
});

it("returns 403 when using a bad token", async () => {
  const token = await registerAndLogin();

  const res = await request(app).get("/api/questions")
    .set("Authorization", `Bearer bad.token`);

  expect(res.status).toBe(403);
});