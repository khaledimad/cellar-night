import { and, eq, inArray, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import {
  alertsSent,
  appearances,
  comedians,
  favourites,
  rooms,
  shows,
} from "@/lib/db/schema";
import { bookingUrl } from "@/lib/booking";

type Pair = {
  userId: string;
  showId: number;
  comedianId: number;
  comedianName: string;
  showDate: string;
  showTime: string;
  startsAt: Date;
  roomName: string;
};

type UserAlert = {
  userId: string;
  pairs: Pair[];
};

export type AlertItem = {
  showId: number;
  comedianName: string;
  showDate: string;
  showTime: string;
  startsAt: Date;
  room: string;
};

const COLOR = {
  page: "#fbf7f2",
  text: "#14100e",
  muted: "#6b5d52",
  accent: "#d93a2b",
  head: "#f0e8df",
  line: "#e2d8cc",
  band: "#14100e",
  wordmark: "#f4ece4",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

function formatDate(showDate: string, withWeekday: boolean): string {
  return new Date(`${showDate}T12:00:00Z`).toLocaleDateString("en-US", {
    ...(withWeekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAlertEmail(
  items: AlertItem[],
  appUrl?: string,
): { subject: string; html: string; text: string } {
  const sorted = [...items].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const showCount = new Set(sorted.map((i) => i.showId)).size;
  const names = [...new Set(sorted.map((i) => i.comedianName))];
  const subject =
    showCount === 1
      ? `${names.join(", ")} added to a Comedy Cellar lineup`
      : `${showCount} new Comedy Cellar shows with your comedians`;

  const dates = sorted.map((i) => i.showDate).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const range =
    first === last ? formatDate(first, false) : `${formatDate(first, false)} to ${formatDate(last, false)}`;
  const headline = `${showCount} ${showCount === 1 ? "show" : "shows"} · ${range}`;

  const sections = names.map((name) => ({
    name,
    rows: sorted
      .filter((i) => i.comedianName === name)
      .map((i) => ({
        date: formatDate(i.showDate, true),
        time: i.showTime,
        room: i.room,
        url: bookingUrl(i.showDate, i.showTime),
      })),
  }));

  const footer =
    "Sent by Who's at the Cellar. You get this because you starred these comedians.";

  const text = [
    "HOT OFF THE LINEUP",
    headline,
    ...(appUrl ? [`See all your shows: ${appUrl}`] : []),
    "",
    ...sections.flatMap((s) => [
      s.name,
      ...s.rows.map((r) => `${r.date}, ${r.time}, ${r.room}: ${r.url}`),
      "",
    ]),
    footer,
  ].join("\n");

  const cell = `padding:10px 8px;border-bottom:1px solid ${COLOR.line};font-size:14px;color:${COLOR.text};`;
  const headCell = `padding:8px;background:${COLOR.head};font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:${COLOR.muted};text-align:left;`;

  const sectionHtml = sections
    .map(
      (s) => `<tr><td style="padding:24px 24px 0 24px;">
<div style="font-size:20px;font-weight:bold;color:${COLOR.accent};padding-bottom:8px;">${escapeHtml(s.name)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-top:1px solid ${COLOR.line};">
<tr><th style="${headCell}">Date</th><th style="${headCell}">Time</th><th style="${headCell}">Room</th><th style="${headCell}">Reserve</th></tr>
${s.rows
  .map(
    (r) =>
      `<tr><td style="${cell}">${escapeHtml(r.date)}</td><td style="${cell}">${escapeHtml(r.time)}</td><td style="${cell}">${escapeHtml(r.room)}</td><td style="${cell}"><a href="${escapeHtml(r.url)}" style="color:${COLOR.accent};font-weight:bold;text-decoration:underline;">Reserve now</a></td></tr>`,
  )
  .join("\n")}
</table></td></tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page};">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;font-family:${FONT};color:${COLOR.text};">
<tr><td style="background:${COLOR.band};color:${COLOR.wordmark};padding:10px 24px;font-size:14px;font-weight:bold;letter-spacing:1px;">Who's at the Cellar</td></tr>
<tr><td style="padding:28px 24px 0 24px;">
<div style="font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${COLOR.accent};">Hot off the lineup</div>
<div style="font-size:28px;line-height:1.2;font-weight:bold;color:${COLOR.text};padding-top:8px;">${escapeHtml(headline)}</div>${
    appUrl
      ? `
<div style="padding-top:10px;font-size:15px;"><a href="${escapeHtml(appUrl)}" style="color:${COLOR.accent};text-decoration:underline;">See all your shows</a></div>`
      : ""
  }
</td></tr>
${sectionHtml}
<tr><td style="padding:28px 24px 32px 24px;font-size:12px;line-height:1.5;color:${COLOR.muted};">${escapeHtml(footer)}</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}

// Emails each user who starred a comedian in the new appearances, once per
// run, and records every pair so it is never sent again.
export async function sendAlerts(newAppearanceIds: number[]): Promise<number> {
  if (newAppearanceIds.length === 0) return 0;

  const rows: Pair[] = await db
    .select({
      userId: favourites.userId,
      showId: shows.id,
      comedianId: comedians.id,
      comedianName: comedians.name,
      showDate: shows.showDate,
      showTime: shows.showTime,
      startsAt: shows.startsAt,
      roomName: rooms.name,
    })
    .from(appearances)
    .innerJoin(favourites, eq(favourites.comedianId, appearances.comedianId))
    .innerJoin(comedians, eq(comedians.id, appearances.comedianId))
    .innerJoin(shows, eq(shows.id, appearances.showId))
    .innerJoin(rooms, eq(rooms.id, shows.roomId))
    .where(
      and(
        inArray(appearances.id, newAppearanceIds),
        sql`${shows.startsAt} > now()`,
        sql`not exists (
          select 1 from ${alertsSent} a
          where a.user_id = ${favourites.userId}
            and a.show_id = ${shows.id}
            and a.comedian_id = ${comedians.id}
        )`,
      ),
    );

  if (rows.length === 0) return 0;

  const byUser = new Map<string, UserAlert>();
  for (const row of rows) {
    let alert = byUser.get(row.userId);
    if (!alert) {
      alert = { userId: row.userId, pairs: [] };
      byUser.set(row.userId, alert);
    }
    alert.pairs.push(row);
  }

  const userIds = [...byUser.keys()];
  const emailRows = (await db.execute(
    sql`select id, email from auth.users where id in (${sql.join(
      userIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})`,
  )) as unknown as { id: string; email: string | null }[];
  const emailOf = new Map(emailRows.map((r) => [r.id, r.email]));

  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Mail settings are missing");
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

  let sent = 0;
  for (const alert of byUser.values()) {
    const to = emailOf.get(alert.userId);
    if (!to) continue;
    const { subject, text, html } = renderAlertEmail(
      alert.pairs.map((p) => ({
        showId: p.showId,
        comedianName: p.comedianName,
        showDate: p.showDate,
        showTime: p.showTime,
        startsAt: p.startsAt,
        room: p.roomName,
      })),
      appUrl,
    );
    await transport.sendMail({
      from: { name: "Who's at the Cellar", address: user },
      to,
      subject,
      text,
      html,
    });
    await db
      .insert(alertsSent)
      .values(
        alert.pairs.map((p) => ({
          userId: p.userId,
          showId: p.showId,
          comedianId: p.comedianId,
        })),
      )
      .onConflictDoNothing();
    sent += 1;
  }
  return sent;
}
