const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

// GET /questions 
// List all questions
router.get("/", async (req, res) => {
    const retrievedQuestions = await prisma.question.findMany(); // find all questions
    res.json(retrievedQuestions);
});

// GET /questions/:questionId
// Show a specific question
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({
        where: { id: questionId }
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    res.json(question);
});


// POST /api/questions
router.post("/", async (req, res) => {
    const {q, a} = req.body;
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    const newQuestion = await prisma.question.create({
        data: {q, a}
    });

    res.status(201).json(newQuestion);
});


// PUT /api/questions/:questionId
router.put("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const {q, a} = req.body;

    const existingQuestion = await prisma.question.findUnique({ where: { id: questionId }});
    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
    }

    
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            q, a
        }
    });

    res.status(201).json(updatedQuestion);
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    
    const existingQuestion = await prisma.question.findUnique({ where: { id: questionId }});
    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ where: { id: questionId }});

    res.json({
        msg: "Question deleted successfully.",
        question: existingQuestion
    });
});


module.exports = router;