const express = require("express");
const supabase = require("../config/supabaseClient");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// 🔐 VERIFY TOKEN & GET USER
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("USER ME ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📝 UPDATE PROFILE
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { name, bio, location, avatar_url } = req.body;
    const { data, error } = await supabase
      .from("users")
      .update({ name, bio, location, avatar_url })
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🏆 LEADERBOARD
router.get("/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, xp, level, avatar_url")
      .order("xp", { ascending: false })
      .limit(10);

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
