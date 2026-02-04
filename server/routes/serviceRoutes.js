const express = require("express");
const supabase = require("../config/supabaseClient");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Create service
router.post("/", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("services")
        .insert([
            {
                title: req.body.title,
                description: req.body.description,
                price: req.body.price,
                category: req.body.category,
                unit: req.body.unit,
                skills: req.body.skills,
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

// Get all services
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("services")
        .select("*, users!inner(name)");

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

// Get my services
router.get("/me", auth, async (req, res) => {
    const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", req.user.id);

    if (error) {
        return res.status(400).json(error);
    }
    res.json(data);
});

module.exports = router;
