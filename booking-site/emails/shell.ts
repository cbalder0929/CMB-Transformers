import { business } from "@/lib/config";
import { env } from "@/lib/env";

/**
 * The shared chrome around every email.
 *
 * Hand-written HTML with inline styles, and a light background rather than the
 * site's dark one. Email clients are not browsers: no <style> support in
 * Gmail's mobile app, no flexbox in Outlook, and dark backgrounds get inverted
 * unpredictably by clients doing their own dark-mode conversion. Tables and
 * inline styles are ugly and they are also what works everywhere.
 */

export const FLAME = "#F56A29";
const INK = "#181420";
const MUTED = "#6B6478";
const HAIRLINE = "#E7E3EC";

export type Email = { subject: string; html: string; text: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function button(href: string, label: string, variant: "solid" | "outline" = "solid") {
  const style =
    variant === "solid"
      ? `background:${FLAME};color:#ffffff;border:1px solid ${FLAME};`
      : `background:#ffffff;color:${INK};border:1px solid ${HAIRLINE};`;

  return `<a href="${href}" style="${style}display:inline-block;padding:14px 28px;border-radius:12px;
    font-size:15px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${escapeHtml(label)}</a>`;
}

export function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:12px;
      letter-spacing:.08em;text-transform:uppercase;color:${MUTED};width:90px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:15px;color:${INK};line-height:1.5;">${value}</td>
  </tr>`;
}

/**
 * @param preheader The grey line clients show next to the subject in the inbox
 *   list. Left unset, they scrape the first text in the body, which is usually
 *   a link or a greeting. Worth setting on every send.
 */
export function shell(opts: { preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#F6F4F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4F9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:520px;background:#ffffff;border-radius:20px;border:1px solid ${HAIRLINE};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${FLAME};">
            ${escapeHtml(business.name)}
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">${opts.body}</td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:20px 32px;text-align:center;font-size:12px;line-height:1.7;color:${MUTED};
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${escapeHtml(business.name)} · ${escapeHtml(business.phone)}<br>
          <a href="${env.app.siteUrl}/privacy" style="color:${MUTED};">Privacy</a> ·
          <a href="${env.app.siteUrl}/terms" style="color:${MUTED};">Terms</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const H1 = `margin:16px 0 0;font-size:26px;line-height:1.25;font-weight:700;color:${INK};letter-spacing:-0.02em;`;
export const P = `margin:14px 0 0;font-size:15px;line-height:1.6;color:${MUTED};`;
export const SMALL = `margin:20px 0 0;font-size:13px;line-height:1.6;color:${MUTED};`;
