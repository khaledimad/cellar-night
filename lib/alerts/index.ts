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
  shows: Map<
    number,
    { showDate: string; showTime: string; startsAt: Date; room: string; names: string[] }
  >;
  pairs: Pair[];
};

function dayLabel(showDate: string): string {
  return new Date(`${showDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

function buildEmail(alert: UserAlert): { subject: string; text: string; html: string } {
  const list = [...alert.shows.values()].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  const names = [...new Set(list.flatMap((s) => s.names))];
  const subject =
    list.length === 1
      ? `${names.join(", ")} added to a Comedy Cellar lineup`
      : `${list.length} new Comedy Cellar shows with your comedians`;

  const text = [
    "Comedians you follow were added to these lineups:",
    "",
    ...list.map((s) =>
      [
        `${s.names.join(", ")}`,
        `${dayLabel(s.showDate)}, ${s.showTime}, ${s.room}`,
        bookingUrl(s.showDate, s.showTime),
        "",
      ].join("\n"),
    ),
  ].join("\n");

  const html = `<p>Comedians you follow were added to these lineups:</p><ul>${list
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.names.join(", "))}</strong><br>${escapeHtml(
          `${dayLabel(s.showDate)}, ${s.showTime}, ${s.room}`,
        )}<br><a href="${bookingUrl(s.showDate, s.showTime)}">Book</a></li>`,
    )
    .join("")}</ul>`;

  return { subject, text, html };
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
      alert = { userId: row.userId, shows: new Map(), pairs: [] };
      byUser.set(row.userId, alert);
    }
    const entry = alert.shows.get(row.showId) ?? {
      showDate: row.showDate,
      showTime: row.showTime,
      startsAt: row.startsAt,
      room: row.roomName,
      names: [],
    };
    entry.names.push(row.comedianName);
    alert.shows.set(row.showId, entry);
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

  let sent = 0;
  for (const alert of byUser.values()) {
    const to = emailOf.get(alert.userId);
    if (!to) continue;
    const { subject, text, html } = buildEmail(alert);
    await transport.sendMail({
      from: `Cellar Night <${user}>`,
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
