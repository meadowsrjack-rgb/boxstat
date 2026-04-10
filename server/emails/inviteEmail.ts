import { Resend } from "resend";
import type { InviteRecord } from "../../shared/types/migration";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(mmddyyyy: string): string {
  if (!mmddyyyy) return "";
  const [month, day, year] = mmddyyyy.split("/");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildEmailHtml(record: InviteRecord, inviteUrl: string, orgName: string): string {
  const { parent, players, programName, teamNames } = record;
  const hasPlayers = players.length > 0;
  const playerNames = players.map((p) => p.firstName).join(", ");
  const allHaveSubDates = hasPlayers && players.every((p) => p.subscriptionEndDate);
  const anyHasSubDate = hasPlayers && players.some((p) => p.subscriptionEndDate);

  const playerRows = players
    .map(
      (p) => {
        const teamName = p.teamId != null && teamNames ? teamNames[p.teamId] : null;
        return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#1a202c">
          ${p.firstName} ${p.lastName}
          ${programName ? `<div style="font-size:12px;color:#6c757d;margin-top:2px">${programName}${teamName ? ` · ${teamName}` : ''}</div>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#6c757d;text-align:right">
          ${p.subscriptionEndDate ? `Until ${formatDate(p.subscriptionEndDate)}` : "—"}
        </td>
      </tr>
    `;
      }
    )
    .join("");

  let introText: string;
  if (!hasPlayers) {
    introText = `<strong style="color:#1a202c">${orgName}</strong> has moved to BoxStat for managing payments. Click below to claim your account and get set up.`;
  } else if (allHaveSubDates) {
    const firstEndDate = formatDate(players[0].subscriptionEndDate!);
    introText = `Your player${players.length > 1 ? "s" : ""} ${playerNames} ${players.length > 1 ? "have" : "has"} been pre-registered. Your current ${orgName} enrolment${programName ? ` in ${programName}` : ''} is honored until ${firstEndDate} — please renew through BoxStat by this date to avoid unenrolment.`;
  } else {
    introText = `Your player${players.length > 1 ? "s" : ""} ${playerNames} ${players.length > 1 ? "have" : "has"} been pre-registered. To complete enrolment${programName ? ` in ${programName}` : ''}, please claim your account and subscribe through the Payments tab.`;
  }

  let calloutText: string;
  if (anyHasSubDate) {
    calloutText = `When your current enrolment ends, please renew through the Payments tab to maintain access. No action needed until then.`;
  } else {
    calloutText = `Please claim your account below and visit the Payments tab to enrol${programName ? ` in ${programName}` : ''}.`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="background:#ffffff;border-radius:12px 12px 0 0;padding:16px;text-align:center">
          <img src="${process.env.APP_URL || process.env.DOMAIN}/assets/logo-full" alt="BoxStat" style="height:48px;width:auto;display:inline-block" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef">
          <p style="font-size:16px;color:#1a202c;margin:0 0 8px;font-weight:500">Hi ${parent.firstName},</p>
          <p style="font-size:14px;color:#6c757d;line-height:1.7;margin:0 0 24px">
            ${introText}
          </p>

          ${hasPlayers ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e9ecef;border-radius:8px;overflow:hidden">
            <tr style="background:#f8f9fa">
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:.05em">Player</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:.05em;text-align:right">Current access</td>
            </tr>
            <tr><td colspan="2" style="padding:0 16px">
              <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#6c757d;line-height:1.7;margin:0 0 24px;padding:12px 16px;background:#f8f9fa;border-radius:8px;border-left:3px solid #3B82F6">
            ${calloutText}
          </p>
          ` : ""}

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
            <tr><td style="background:#C0392B;border-radius:8px;text-align:center">
              <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;color:white;font-size:14px;font-weight:600;text-decoration:none">
                Claim my account
              </a>
            </td></tr>
          </table>

          <p style="font-size:12px;color:#adb5bd;text-align:center;margin:0">
            If you weren't expecting this email, you can safely ignore it.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fa;border:1px solid #e9ecef;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
          <p style="font-size:12px;color:#adb5bd;margin:0">
            BoxStat · <a href="https://boxstat.app" style="color:#adb5bd">boxstat.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlayerAddedEmailHtml(record: InviteRecord, orgName: string): string {
  const { parent, players, programName, teamNames } = record;
  const playerNames = players.map((p) => p.firstName).join(", ");
  const appUrl = process.env.APP_URL || 'https://boxstat.app';

  const playerRows = players
    .map((p) => {
      const teamName = p.teamId != null && teamNames ? teamNames[p.teamId] : null;
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#1a202c">
          ${p.firstName} ${p.lastName}
          ${programName ? `<div style="font-size:12px;color:#6c757d;margin-top:2px">${programName}${teamName ? ` · ${teamName}` : ''}</div>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#6c757d;text-align:right">
          ${p.subscriptionEndDate ? `Until ${formatDate(p.subscriptionEndDate)}` : "—"}
        </td>
      </tr>`;
    })
    .join("");

  const allHaveSubDates = players.every((p) => p.subscriptionEndDate);

  let actionText: string;
  if (allHaveSubDates) {
    const firstEndDate = formatDate(players[0].subscriptionEndDate!);
    actionText = `Your current ${orgName} enrolment${programName ? ` in ${programName}` : ''} is honored until ${firstEndDate} — please renew through BoxStat by this date to avoid unenrolment.`;
  } else {
    actionText = `To complete enrolment${programName ? ` in ${programName}` : ''}, please visit the Payments tab in your account.`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="background:#ffffff;border-radius:12px 12px 0 0;padding:16px;text-align:center">
          <img src="${appUrl}/assets/logo-full" alt="BoxStat" style="height:48px;width:auto;display:inline-block" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef">
          <p style="font-size:16px;color:#1a202c;margin:0 0 8px;font-weight:500">Hi ${parent.firstName},</p>
          <p style="font-size:14px;color:#6c757d;line-height:1.7;margin:0 0 24px">
            Your ${orgName} admin has added ${players.length > 1 ? 'new players' : 'a new player'} to your account: ${playerNames}. ${actionText}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e9ecef;border-radius:8px;overflow:hidden">
            <tr style="background:#f8f9fa">
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:.05em">Player</td>
              <td style="padding:10px 16px;font-size:11px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:.05em;text-align:right">Current access</td>
            </tr>
            <tr><td colspan="2" style="padding:0 16px">
              <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
            </td></tr>
          </table>

          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
            <tr><td style="background:#C0392B;border-radius:8px;text-align:center">
              <a href="${appUrl}" style="display:inline-block;padding:12px 28px;color:white;font-size:14px;font-weight:600;text-decoration:none">
                Open BoxStat
              </a>
            </td></tr>
          </table>

          <p style="font-size:12px;color:#adb5bd;text-align:center;margin:0">
            If you weren't expecting this email, you can safely ignore it.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fa;border:1px solid #e9ecef;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
          <p style="font-size:12px;color:#adb5bd;margin:0">
            BoxStat · <a href="https://boxstat.app" style="color:#adb5bd">boxstat.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPlayerAddedNotification(
  record: InviteRecord,
  orgName: string
): Promise<{ success: boolean; error?: string }> {
  const { parent, players } = record;
  const playerNames = players.map((p) => p.firstName).join(", ");
  const subject = `${playerNames} ${players.length > 1 ? 'have' : 'has'} been added to your ${orgName} account`;

  try {
    const { error } = await resend.emails.send({
      from: `BoxStat <invites@${process.env.EMAIL_DOMAIN || "boxstat.app"}>`,
      to: parent.email,
      subject,
      html: buildPlayerAddedEmailHtml(record, orgName),
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function sendMigrationInvite(
  record: InviteRecord,
  inviteToken: string,
  orgName: string
): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${process.env.APP_URL}/invite/${inviteToken}`;
  const { parent, players } = record;

  const playerNames = players.map((p) => p.firstName);
  const subject =
    playerNames.length > 0
      ? `${orgName} has moved to BoxStat — your players are ready`
      : `You've been invited to join ${orgName} on BoxStat`;

  try {
    const { error } = await resend.emails.send({
      from: `BoxStat <invites@${process.env.EMAIL_DOMAIN || "boxstat.app"}>`,
      to: parent.email,
      subject,
      html: buildEmailHtml(record, inviteUrl, orgName),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
