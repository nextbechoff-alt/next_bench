const express = require("express");
const supabase = require("../config/supabaseClient");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Create study buddy request
router.post("/", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("study_buddy")
        .insert([
            {
                subject: req.body.subject,
                topic: req.body.topic,
                description: req.body.description,
                college: req.body.college,
                max_members: req.body.max_members,
                schedule: req.body.schedule,
                location: req.body.location,
                level: req.body.level,
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

// Get all study buddies
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("study_buddy")
        .select("*, users!inner(name)");

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

module.exports = router;
