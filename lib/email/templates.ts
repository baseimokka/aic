import type { NotificationEmail } from "./notify";

/** Escape user-supplied text before interpolating into notification HTML. */
function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Row = [label: string, value: string | null | undefined];

function renderRows(rows: Row[]): { html: string; text: string } {
  const present = rows.filter((r): r is [string, string] => Boolean(r[1] && r[1].trim()));
  const html = present
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 14px 6px 0;color:#6E6A80;white-space:nowrap;vertical-align:top">${esc(label)}</td>` +
        `<td style="padding:6px 0;color:#201146;font-weight:600">${esc(value).replaceAll("\n", "<br>")}</td></tr>`,
    )
    .join("");
  const text = present.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { html, text };
}

function wrap(title: string, intro: string, rowsHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;color:#201146;margin:0 0 4px">${esc(title)}</h1>
  <p style="font-size:14px;color:#6E6A80;margin:0 0 18px">${esc(intro)}</p>
  <table style="font-size:14px;border-collapse:collapse">${rowsHtml}</table>
  <p style="font-size:12px;color:#9895A3;margin-top:22px">AIC Travel × SoHolidays — automated notification. Manage this lead in the dashboard.</p>
</div>`;
}

export function bookingRequestEmail(input: {
  reference: string;
  tourTitle: string | null;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  preferredDate: string | null;
  adults: number;
  children: number;
  hotelName?: string;
  roomNumber?: string;
  specialRequests?: string;
}): NotificationEmail {
  const rows = renderRows([
    ["Reference", input.reference],
    ["Tour", input.tourTitle ?? "(general request)"],
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Country", input.country],
    ["Preferred date", input.preferredDate],
    ["Travelers", `${input.adults} adult(s)${input.children > 0 ? `, ${input.children} child(ren)` : ""}`],
    ["Hotel", input.hotelName],
    ["Room", input.roomNumber],
    ["Special requests", input.specialRequests],
  ]);
  const subject = `New booking request ${input.reference}${input.tourTitle ? ` — ${input.tourTitle}` : ""}`;
  return {
    subject,
    html: wrap("New booking request", "A new lead just arrived from the website booking form.", rows.html),
    text: `New booking request\n\n${rows.text}`,
  };
}

export function transferRequestEmail(input: {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  passengers: number;
  vehicleName: string;
  fromName: string;
  toName: string;
  priceLabel: string | null;
  notes?: string;
}): NotificationEmail {
  const rows = renderRows([
    ["Reference", input.reference],
    ["Route", `${input.fromName} → ${input.toName}`],
    ["Vehicle", input.vehicleName],
    ["Pickup date", input.pickupDate],
    ["Passengers", String(input.passengers)],
    ["Price", input.priceLabel ?? "On request (no configured route price)"],
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Notes", input.notes],
  ]);
  return {
    subject: `New transfer request ${input.reference} — ${input.fromName} → ${input.toName}`,
    html: wrap("New transfer request", "A new transfer request just arrived from the website.", rows.html),
    text: `New transfer request\n\n${rows.text}`,
  };
}

export function contactEmail(input: {
  fullName: string;
  email: string;
  phone?: string;
  message: string;
}): NotificationEmail {
  const rows = renderRows([
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Message", input.message],
  ]);
  return {
    subject: `New contact message — ${input.fullName}`,
    html: wrap("New contact message", "Someone reached out through the website contact form.", rows.html),
    text: `New contact message\n\n${rows.text}`,
  };
}
