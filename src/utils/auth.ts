import { supabase } from "./supabase";

export const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};

export const logout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Supabase signout error:", err);
  }
  localStorage.clear(); // Clear everything
  window.location.href = "/"; // Force full reload to clear all states
};
