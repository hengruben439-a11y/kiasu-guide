export function confirmationEmail({
  confirmationUrl,
}: {
  confirmationUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your email — The Kiasu Guide</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f0ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 48px auto; background: #fdf8f2; border-radius: 16px; overflow: hidden; border: 1px solid rgba(42,31,26,0.08); }
    .header { background: #2a1f1a; padding: 36px 40px; position: relative; }
    .header-dot-grid { position: absolute; inset: 0; opacity: 0.3; background-image: radial-gradient(circle, #c4a882 1px, transparent 1px); background-size: 24px 24px; }
    .logo { position: relative; z-index: 1; }
    .logo-name { font-size: 18px; font-weight: 700; color: #fdf8f2; margin: 0 0 4px; letter-spacing: -0.01em; }
    .logo-tag { font-size: 10px; color: #c4a882; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; margin: 0; }
    .body { padding: 44px 40px; }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #c4a882; margin: 0 0 10px; }
    .heading { font-size: 26px; font-weight: 700; color: #2a1f1a; margin: 0 0 16px; line-height: 1.25; letter-spacing: -0.02em; }
    .body-text { font-size: 14px; color: #6b5744; line-height: 1.65; margin: 0 0 32px; }
    .btn { display: inline-block; background: #7a1c2e; color: #fdf8f2 !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; letter-spacing: 0.01em; }
    .btn-wrap { margin-bottom: 32px; }
    .divider { border: none; border-top: 1px solid rgba(42,31,26,0.08); margin: 32px 0; }
    .fallback { font-size: 12px; color: #a89070; line-height: 1.6; margin: 0; }
    .fallback a { color: #7a1c2e; word-break: break-all; }
    .footer { background: #2a1f1a; padding: 24px 40px; }
    .footer p { font-size: 11px; color: rgba(253,248,242,0.35); margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">

    <div class="header">
      <div class="header-dot-grid"></div>
      <div class="logo">
        <p class="logo-name">The Kiasu Guide</p>
        <p class="logo-tag">Financial clarity for Singapore</p>
      </div>
    </div>

    <div class="body">
      <p class="eyebrow">One more step</p>
      <h1 class="heading">Confirm your email address</h1>
      <p class="body-text">
        Thanks for signing up. Click the button below to verify your email and get access to your financial dashboard — retirement analysis, CPF projections, coverage maps, and more.
      </p>

      <div class="btn-wrap">
        <a href="${confirmationUrl}" class="btn">Confirm my email →</a>
      </div>

      <hr class="divider" />

      <p class="fallback">
        Button not working? Copy and paste this link into your browser:<br />
        <a href="${confirmationUrl}">${confirmationUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p>
        You received this because you signed up at thekiasuguide.com. If you didn't, you can safely ignore this email.<br />
        © 2026 The Kiasu Guide · Singapore
      </p>
    </div>

  </div>
</body>
</html>`
}
