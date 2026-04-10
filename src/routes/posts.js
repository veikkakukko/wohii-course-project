const express = require("express");
const router = express.Router();

const posts = require("../data/posts");

// GET /posts 
// List all posts
router.get("/", (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.json(posts);
    }

    const filteredPosts = posts.filter(post =>
        post.keywords.includes(keyword.toLowerCase())
    );

    res.json(filteredPosts);
});

// GET /posts/:postId
// Show a specific post
router.get("/:postId", (req, res) => {
    const postId = Number(req.params.postId);

    const post = posts.find((p) => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
});

// POST /api/posts
router.post("/", (req, res) => {
    const {question, answer} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    const existingIds = posts.map(p=>p.id)
    const maxId = Math.max(...existingIds)
    const newPost = {
        id: posts.length ? maxId + 1 : 1,
        question, answer
    }
    posts.push(newPost);
    res.status(201).json(newPost);
});

// PUT /api/posts/:postId
router.put("/:postId", (req, res) => {
    const postId = Number(req.params.postId);

    const post = posts.find((p) => p.id === postId);
    if (!post) {
        return res.status(404).json({ message: "Post not found" });
    }

    const {question, answer} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required."})
    }

    post.question = question;
    post.answer = answer;

    res.status(201).json(post);

});

// DELETE /api/posts/:postId
router.delete("/:postId", (req, res) => {
    const postId = Number(req.params.postId);
    const postIndex = posts.findIndex(p=> p.id === postId);

    if (postIndex === -1){
        return res.status(404).json({msg: "Post not found."})
    }
    const deletedPost = posts.splice(postIndex, 1);
    res.json({
        msg: "Post deleted successfully.",
        post: deletedPost
    });
});


module.exports = router;