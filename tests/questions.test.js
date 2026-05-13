const { resetDb, registerAndLogin, createQuestion, request, app, prisma } = require("./helpers");
import { beforeEach, it, expect, describe } from 'vitest';

beforeEach(resetDb);

describe("question tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown question", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 400 for invalid question body", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ q: "" });
    expect(res.status).toBe(400);
  });

  //  Create a question (POST), then GET it by ID
  it("created question can be found by id", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "What?", a: "That." });

      const res = await request(app).get(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.q).toBe("What?");
  });

  // PUT to update own question
  it("updating own question works", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "Question before", a: "Answer before" });

      const before = await request(app).put(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ q: "Question after", a: "Answer after"});
      
      const res = await request(app).get(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.q).toBe("Question after");
      expect(res.body.a).toBe("Answer after");
  });

  // PUT to update unexisting question
  it("updating unexisting question returns 404", async () => {
      const token = await registerAndLogin();

      const res = await request(app).put("/api/questions/999999")
        .set("Authorization", `Bearer ${token}`)
        .send({ q: "Question after", a: "Answer after"});
      
      expect(res.status).toBe(404);
  });

  // PUT with missing fields
  it("updating unexisting question returns 400", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "What?", a: "That." });

      const res = await request(app).put(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ q: "Question after"});
      
      expect(res.status).toBe(400);
  });

  // POST /play with correct and incorrect answers
  // correct
  it("submitting an correct answer sets correctness to true", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "What?", a: "That." });

      const res = await request(app).post(`/api/questions/${created.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "That." });
      
      expect(res.status).toBe(201);
      expect(res.body.correct).toBe(true);
  });

  // incorrect
  it("submitting an incorrect answer sets correctness to false", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "What?", a: "That." });

      const res = await request(app).post(`/api/questions/${created.id}/play`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "I don't know." });
      
      expect(res.status).toBe(201);
      expect(res.body.correct).toBe(false);
  });

  //  DELETE own question
  it("own question can be deleted and can't be found after", async () => {
      const token = await registerAndLogin();
      const created = await createQuestion(token, { q: "What?", a: "That." });

      await request(app).delete(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app).get(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(404);
  });


  //  DELETE another user's question
  it("another user's question can't be deleted and can still be found after trying", async () => {
      const token_user1 = await registerAndLogin("user1@test.com", "User1");
      const token_user2 = await registerAndLogin("user2@test.com", "User2");
      const created = await createQuestion(token_user1, { q: "What?", a: "That." });

      const res1 = await request(app).delete(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token_user2}`);

      const res2 = await request(app).get(`/api/questions/${created.id}`)
        .set("Authorization", `Bearer ${token_user2}`);
      
      expect(res1.status).toBe(403)
      expect(res2.status).toBe(200);
  });

  //  DELETE non existent
  it("return 404 if deleting non-existent question", async () => {
      const token = await registerAndLogin();

      const res = await request(app).delete("/api/questions/999999")
        .set("Authorization", `Bearer ${token}`);
      
      expect(res.status).toBe(404);
  });

});

