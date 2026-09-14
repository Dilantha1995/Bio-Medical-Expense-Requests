import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAppSettings } from "@/lib/data";
import { notify } from "@/lib/notifications";
import { todayInTz, addDaysToDateString } from "@/lib/formatDate";

export const runtime = "nodejs";

// Daily reminder: nudge the engineer 1 day before an approved travel
// advance's expected completion date if the task hasn't been marked done
// yet, and they haven't already been reminded today. Triggered by Vercel
// Cron (see vercel.json); requires a CRON_SECRET env var so only Vercel
// (or someone who knows the secret) can call it.
export async function GET(req) {
  try {
    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET is not set in your environment variables." }, { status: 500 });
    }
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const settings = await getAppSettings();
    const today = todayInTz(settings.timezone);
    const tomorrow = addDaysToDateString(today, 1);

    const { rows } = await query(
      `SELECT ar.id, ar.ref_number, ar.engineer_id, ar.expected_end_date
       FROM advance_requests ar
       WHERE ar.status='approved' AND ar.deleted_at IS NULL AND ar.task_completed_at IS NULL
         AND ar.expected_end_date = $1
         AND (ar.last_reminder_sent_on IS NULL OR ar.last_reminder_sent_on < $2)`,
      [tomorrow, today]
    );

    for (const r of rows) {
      await notify(
        r.engineer_id,
        "Task due tomorrow",
        `${r.ref_number} is due to finish tomorrow (${tomorrow}). If it isn't complete yet, mark it done or request an extension.`,
        `/requests/${r.id}`
      );
      await query(`UPDATE advance_requests SET last_reminder_sent_on=$1 WHERE id=$2`, [today, r.id]);
    }

    return NextResponse.json({ remindersSent: rows.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Reminder job failed." }, { status: e.status || 500 });
  }
}
