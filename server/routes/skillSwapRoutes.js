const express = require("express");
const supabase = require("../config/supabaseClient");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Create skill swap listing
router.post("/", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("skill_swap")
        .insert([
            {
                skill_offered: req.body.skill_offered,
                skill_wanted: req.body.skill_wanted,
                description: req.body.description,
                category: req.body.category,
                user_id: req.user.id,
            },
        ])
        .select()
        .single();

    if (error) {
        return res.status(400).json(error);
    }
    res.status(201).json(data);
});

// Get all skill swaps
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("skill_swap")
        .select("*, users!inner(name)");

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

module.exports = router;
