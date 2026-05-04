const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");



const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const newName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`
        cb(null, newName)
    }
})
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image")) {
            cb(null, true)
        } else {
            cb(new Error("Only images allowed"))
        }
    },
    limits: {fileSize: 5 * 1024 * 1024}
})

function formatQuestion(question) {
    return {
        ...question,
        userName: question.user ? question.user.name : null,
        solved: question.attempts?.[0]?.correctness ?? false,
        user: undefined,
        attempts: undefined, 
    }
}


// Apply authentication to ALL routes in this router
router.use(authenticate);

// GET /questions, /questions?keyword&page=1&limit=5
// List all questions (keyword?)
router.get("/", async (req, res) => {

    const {keyword} = req.query;

    const where = keyword ?
    { keywords: { some: { name: keyword } } } : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit)) || 5);
    const skip = (page - 1) * limit;

    const [retrievedQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: { 
            keywords: true,
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
        },
        orderBy: { id: "asc" },
        skip,
        take: limit
    }), prisma.question.count({where})]);

    res.json({
        data: retrievedQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    })
});

// GET /questions/:questionId
// Show a specific question
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        include: {
            user: true ,
            keywords: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            //correctness: { select: { correctness: true } },
        },
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    res.json(formatQuestion(question));
});


// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const {q, a, keywords} = req.body;
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    //const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newQuestion = await prisma.question.create({
        data: {q, a, userId: req.user.userId, imageUrl: imageUrl},
    });

    res.status(201).json(formatQuestion(newQuestion));
});


// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, upload.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);
    const {q, a} = req.body;

    const existingQuestion = await prisma.question.findUnique({ 
        where: { id: questionId }
    });



    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
    }

    
    if (!q || !a) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;


    const updatedQuestion = await prisma.question.update({
        where: { id: questionId },
        data: {
            q, a, imageUrl
        },
        include: { 
            user: true ,
            correctness: { select: { correctness: true } },
        },
    });

    res.status(201).json(formatQuestion(updatedQuestion));
});

// play
// POST /questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const correctAnswer = question.a;

    const isCorrect = ( correctAnswer == answer );

    const attempt = await prisma.attempt.upsert({
        where: { userId_questionId: { userId: req.user.userId, questionId } },
        update: { correctness: isCorrect },
        create: { userId: req.user.userId, questionId, correctness: isCorrect },
    });

    res.status(201).json({
        id: attempt.id,
        correct: isCorrect,
        submittedAnswer: answer,
        correctAnswer: correctAnswer,
        createdAt: attempt.createdAt,
    });

    // Expected response example:
    //{
    //    "id”: 1, // id in the database of attempt id
    //    "correct": true ,
    //    "submittedAnswer": ”Helsinki”,
    //    "correctAnswer": ”Helsinki”,
    //    "createdAt": “2026-04-29 20:00” // timestamp when it was submitted
    //}



});

// unlike
// DELETE /questions/:questionId/like
router.delete("/:questionId/like", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.like.deleteMany({
        where: { userId: req.user.userId, questionId },
    });

    const likeCount = await prisma.like.count({ where: { questionId } });

    res.json({ questionId, liked: false, likeCount });
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    
    const existingQuestion = await prisma.question.findUnique({ where: { id: questionId }});
    if (!existingQuestion) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ 
        where: { id: questionId },
    });

    res.json({
        msg: "Question deleted successfully.",
        question: existingQuestion
    });
});


module.exports = router;