"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { roundDownTo15Minutes, formatMsToHHMM } from "../lib/time";
import * as XLSX from "xlsx";

type Profile = {
  user_id: string;
  full_name: string;
  role: string;
};

type Shift = {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string | null;
};

/**
 * Admin page to view monthly summaries and export them as XLSX.
 */
export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Load profiles and shifts whenever user or month changes
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, role");
      if (!profilesError) setProfiles(profilesData ?? []);

      const [y, m] = month.split("-").map(Number);
      const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, user_id, start_at, end_at")
        .gte("start_at", startDate.toISOString())
        .lt("start_at", endDate.toISOString());
      if (!shiftsError) setShifts(shiftsData ?? []);
    };
    loadData();
  }, [user, month]);

  /**
   * Compute the total rounded duration (ms) for a given user in the current month.
   */
  const computeUserSummary = (uid: string): number => {
    const userShifts = shifts.filter((s) => s.user_id === uid && s.end_at);
    let totalMs = 0;
    userShifts.forEach((s) => {
      const start = new Date(s.start_at).getTime();
      const end = new Date(s.end_at as string).getTime();
      const diff = end - start;
      const rounded = roundDownTo15Minutes(diff);
      totalMs += rounded;
    });
    return totalMs;
  };

  /**
   * Export the monthly data to an XLSX file with a summary and detail sheet.
   */
  const exportXLSX = () => {
    const summaryData: any[] = [];
    profiles.forEach((p) => {
      const totalMs = computeUserSummary(p.user_id);
      summaryData.push({
        Jméno: p.full_name,
        "Odpracováno (15m)": formatMsToHHMM(totalMs),
      });
    });
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    const detailData: any[] = [];
    shifts.forEach((s) => {
      if (!s.end_at) return;
      const rawMs = new Date(s.end_at).getTime() - new Date(s.start_at).getTime();
      const roundedMs = roundDownTo15Minutes(rawMs);
      detailData.push({
        Jméno: profiles.find((p) => p.user_id === s.user_id)?.full_name ?? s.user_id,
        Začátek: new Date(s.start_at).toLocaleString(),
        Konec: new Date(s.end_at).toLocaleString(),
        "Odpracováno (raw)": formatMsToHHMM(rawMs),
        "Odpracováno (15m)": formatMsToHHMM(roundedMs),
      });
    });
    const wsDetail = XLSX.utils.json_to_sheet(detailData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Souhrn");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dochazka-${month}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) return <main style={{ padding: "1rem" }}>Načítání…</main>;

  return (
    <main style={{ padding: "1rem" }}>
      <h1>Admin – Přehled docházky</h1>
      <label>
        Měsíc:
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ marginLeft: "0.5rem" }}
        />
      </label>
      <button onClick={exportXLSX} style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}>
        Exportovat XLSX
      </button>
      <table style={{ marginTop: "1rem", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Jméno</th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Odpracováno (15m)
            </th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.user_id}>
              <td style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                {p.full_name}
              </td>
              <td style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                {formatMsToHHMM(computeUserSummary(p.user_id))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
