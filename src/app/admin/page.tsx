"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatMsToHHMM, roundDownTo15Minutes } from "@/lib/time";
import * as XLSX from "xlsx";

export default function AdminPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  async function exportXlsx() {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const { data: profiles, error: profErr } = await supabase.from("profiles").select("user_id, full_name, role");
    if (profErr) {
      alert(profErr.message);
      return;
    }
    const { data: shifts, error: shiftErr } = await supabase
      .from("shifts")
      .select("id,user_id,start_at,end_at")
      .gte("start_at", startDate.toISOString())
      .lt("start_at", endDate.toISOString());
    if (shiftErr) {
      alert(shiftErr.message);
      return;
    }
    const byUser: Record<string, any[]> = {};
    for (const shift of shifts ?? []) {
      if (!byUser[shift.user_id]) byUser[shift.user_id] = [];
      byUser[shift.user_id].push(shift);
    }
    const summary: any[] = [];
    for (const profile of profiles ?? []) {
      const userShifts = byUser[profile.user_id] ?? [];
      let totalRawMs = 0;
      let totalRoundedMs = 0;
      for (const shift of userShifts) {
        if (!shift.end_at) continue;
        const diff = new Date(shift.end_at).getTime() - new Date(shift.start_at).getTime();
        totalRawMs += diff;
        totalRoundedMs += roundDownTo15Minutes(diff);
      }
      summary.push({
        "Jméno": profile.full_name,
        Role: profile.role,
        "Počet směn": userShifts.length,
        "Odpracováno (raw)": formatMsToHHMM(totalRawMs),
        "Odpracováno (15m)": formatMsToHHMM(totalRoundedMs),
      });
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws, "Souhrn");
    XLSX.writeFile(wb, `dochazka-${year}-${String(month).padStart(2, "0")}.xlsx`);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin export</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>
          Rok:
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || 0)}
            style={{ marginLeft: 4 }}
          />
        </label>
        <label>
          Měsíc:
          <input
            type="number"
            value={month}
            min={1}
            max={12}
            onChange={(e) => setMonth(parseInt(e.target.value, 10) || 0)}
            style={{ marginLeft: 4 }}
          />
        </label>
        <button onClick={exportXlsx} style={{ padding: 8 }}>
          Exportovat XLSX
        </button>
      </div>
    </main>
  );
}
