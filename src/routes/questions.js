const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /questions 
// List all questions
router.get("/", (req, res) => {
    res.json(questions);
});

// GET /questions/:questionId
// Show a specific questions
router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = questions.find((p) => p.id === questionId);

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    res.json(question);
});

// QUESTION /api/questions
router.post("/", (req, res) => {
    const {q, a} = req.body;
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    const existingIds = questions.map(p=>p.id)
    const maxId = Math.max(...existingIds)
    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        q, a
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});

// PUT /api/questions/:questionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = questions.find((p) => p.id === questionId);
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const {q, a} = req.body;
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    question.q = q;
    question.a = a;

    res.status(201).json(question);

});

// DELETE /api/questions/:questionId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex(p=> p.id === questionId);

    if (questionIndex === -1){
        return res.status(404).json({msg: "Question not found."})
    }
    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg: "Question deleted successfully.",
        question: deletedQuestion
    });
});


module.exports = router;