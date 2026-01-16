"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase;"

type Shift = { id: string; start_at: string; end_at: string | null };

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [openShift, setOpenShift] = useState<Shift | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadOpenShift();
  }, [user]);

  async function loadOpenShift() {
    const { data, error } = await supabase
      .from("shifts")
      .select("id,start_at,end_at")
      .is("end_at", null)
      .order("start_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    setOpenShift((data?.[0] as any) ?? null);
  }

  async function clockIn() {
    const { error } = await supabase.from("shifts").insert({ start_at: new Date().toISOString() });
    if (error) alert(error.message);
    await loadOpenShift();
  }

  async function clockOut() {
    if (!openShift) return;
    const { error } = await supabase
      .from("shifts")
      .update({ end_at: new Date().toISOString() })
      .eq("id", openShift.id);
    if (error) alert(error.message);
    await loadOpenShift();
  }

  async function signIn(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Poslal jsem přihlášovací odkaz na email.");
  }

  if (!user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Docházka</h1>
        <button onClick={() => signIn(prompt("Email:") || "")}>Přihlásit se e‑mailem</button>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Docházka</h1>
      <p>Přihlášen: {user.email}</p>

      {!openShift ? (
        <button onClick={clockIn} style={{ padding: 12, fontSize: 18 }}>Příchod</button>
      ) : (
        <>
          <p>Směna běží od: {new Date(openShift.start_at).toLocaleString()}</p>
          <button onClick={clockOut} style={{ padding: 12, fontSize: 18 }}>Odchod</button>
        </>
      )}
    </main>
  );
}
