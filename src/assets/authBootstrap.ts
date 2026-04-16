// authBootstrap.ts
import { supabase } from "./supabaseClient";

function removeSupabaseAuthStorage() {
  // Supabase suele guardar algo tipo: sb-<project-ref>-auth-token
  // Mejor borrar todas las keys sb-*
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-"))
    .forEach((k) => localStorage.removeItem(k));
}

export async function bootstrapAuth() {
  try {
    // intenta leer sesión (si hay token roto, aquí suele petar o quedarse raro)
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (e) {
    // reset duro
    try { await supabase.auth.signOut(); } catch {}
    removeSupabaseAuthStorage();
    return null;
  }
}
