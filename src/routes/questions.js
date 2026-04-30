const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

// homma jäi siihen, että keywordien käyttö pitää vielä päivittää koko systeemiin.
// Lisäksi frontend ei ihan kunnolla toimi

const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
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
        likeCount: question._count?.likes ?? 0,
        liked: question.likes ? question.likes.length > 0 : false,
        user: undefined,
        likes: undefined,
        _count: undefined,
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
    const limit = Math.max(1, Math.min(100, parseInt(req.query.page)) || 5);
    const skip = (page - 1) * limit;

    const [retrievedQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: { 
            keywords: true,
            user: true ,
            likes: { where : { userId: req.user.userId }, take: 1 },
            _count: { select: { likes: true } },
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
            likes: { where : { userId: req.user.userId }, take: 1 },
            _count: { select: { likes: true } },
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

    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;

    const newQuestion = await prisma.question.create({
        data: {q, a, userId: req.user.userId}
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
            likes: { where : { userId: req.user.userId }, take: 1 },
            _count: { select: { likes: true } },
        },
    });

    res.status(201).json(formatQuestion(updatedQuestion));
});

// like
// POST /questions/:questionId/like
router.post("/:questionId/like", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const like = await prisma.like.upsert({
        where: { userId_questionId: { userId: req.user.userId, questionId } },
        update: {},
        create: { userId: req.user.userId, questionId },
    });

    const likeCount = await prisma.like.count({ where: { questionId } });

    res.status(201).json({
        id: like.id,
        questionId,
        liked: true,
        likeCount,
        createdAt: like.createdAt,
    });
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
        include: { 
            user: true ,
            likes: { where : { userId: req.user.userId }, take: 1 },
            _count: { select: { likes: true } },
        },
    });

    res.json({
        msg: "Question deleted successfully.",
        question: existingQuestion
    });
});


module.exports = router;