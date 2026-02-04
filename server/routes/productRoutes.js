const express = require("express");
const supabase = require("../config/supabaseClient");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Create product
router.post("/", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        image_url: req.body.image_url,
        condition: req.body.condition,
        campus: req.body.campus,
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

// Get all products
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*, users!inner(name)");

  if (error) {
    return res.status(400).json(error);
  }
  res.json(data);
});

// Get my products
router.get("/me", auth, async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) {
    return res.status(400).json(error);
  }
  res.json(data);
});

module.exports = router;
