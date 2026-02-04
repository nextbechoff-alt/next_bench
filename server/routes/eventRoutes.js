const express = require("express");
const supabase = require("../config/supabaseClient");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Create event
router.post("/", auth, async (req, res) => {
    const { title, name, description, category, date, time, location, fee, max_participants } = req.body;
    const { data, error } = await supabase
        .from("events")
        .insert([
            {
                title: title || name,
                description,
                category,
                type: req.body.type,
                date,
                time,
                location,
                college: req.body.college,
                fee: fee || 0,
                max_participants,
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

// Get all events
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("events")
        .select("*, users!inner(name)");

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

// Get my events
router.get("/me", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", req.user.id);

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

module.exports = router;
