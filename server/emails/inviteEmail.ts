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
  const { parent, players } = record;
  const hasPlayers = players.length > 0;
  const playerNames = players.map((p) => p.firstName).join(", ");

  const playerRows = players
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#1a202c">
          ${p.firstName} ${p.lastName}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#6c757d;text-align:right">
          ${p.subscriptionEndDate ? `Access until ${formatDate(p.subscriptionEndDate)}` : "—"}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Header -->
        <tr><td style="background:#0B1F3A;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
          <span style="font-size:20px;font-weight:600;color:white;letter-spacing:-.3px">
            <span style="display:inline-block;background:#C0392B;border-radius:6px;width:28px;height:28px;line-height:28px;text-align:center;font-size:14px;margin-right:8px;vertical-align:middle">B</span>
            Boxstat
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px;border-left:1px solid #e9ecef;border-right:1px solid #e9ecef">
          <p style="font-size:16px;color:#1a202c;margin:0 0 8px;font-weight:500">Hi ${parent.firstName},</p>
          <p style="font-size:14px;color:#6c757d;line-height:1.7;margin:0 0 24px">
            <strong style="color:#1a202c">${orgName}</strong> has moved to Boxstat for managing memberships and payments.
            ${hasPlayers
              ? `Your player${players.length > 1 ? "s" : ""} (${playerNames}) ${players.length > 1 ? "have" : "has"} been pre-registered — their current access is honored through the existing subscription end date.`
              : "Click below to claim your account and get set up."}
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
            When your current subscription ends, you'll be prompted to renew directly through Boxstat. No action needed until then.
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
            Boxstat · <a href="https://boxstat.app" style="color:#adb5bd">boxstat.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
      ? `${orgName} has moved to Boxstat — your players are ready`
      : `You've been invited to join ${orgName} on Boxstat`;

  try {
    const { error } = await resend.emails.send({
      from: `Boxstat <invites@${process.env.EMAIL_DOMAIN || "boxstat.app"}>`,
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
