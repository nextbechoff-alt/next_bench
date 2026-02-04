const supabase = require("../config/supabaseClient");

// 🔐 PASSWORD REGEX
const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;

// ✅ REGISTER
exports.register = async (req, res) => {
  console.log(">>> [REGISTER REQUEST] Received:", req.body.email);
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 🔒 PASSWORD VALIDATION
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and include a number and a special character",
      });
    }

    // 1. Register user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    // 2. Create user profile in 'users' table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          name,
          email,
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error("USER PROFILE CREATION ERROR:", userError);
      return res.status(400).json({
        message: `Database error saving user profile: ${userError.message}`,
        error: userError
      });
    }

    res.status(201).json({
      token: authData.session?.access_token,
      user: {
        id: authData.user.id,
        name: name,
        email: email,
      },
      message: authData.session
        ? "Registration successful."
        : "Registration successful. Please check your email for verification.",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Fetch user profile from 'users' table
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata.full_name,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
