import * as React from "react";
import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import { email } from "./theme";

/**
 * Outer shell for every AIC transactional email.
 *
 * - Table-based (React Email primitives) for maximum client compatibility.
 * - Declares `color-scheme` + a small dark-mode stylesheet so supporting
 *   clients (Apple Mail, iOS) shift the ground/cards/text without breaking
 *   the light-first design.
 * - Ships responsive rules keyed off class names used by the inner
 *   components (`sm-px`, `btn-full`, …) since `@media` can't touch inline
 *   styles; these overrides use `!important` so they win over inline values.
 */
const HEAD_CSS = `
  /* base resets for stubborn clients */
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse !important; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  .btn-primary:hover { background:${email.color.accentDeep} !important; }
  .link-underline:hover { text-decoration:underline !important; }

  /* ---- responsive (mobile-first stack) ---- */
  @media only screen and (max-width:620px) {
    .sm-full { width:100% !important; max-width:100% !important; }
    .sm-px { padding-left:20px !important; padding-right:20px !important; }
    .sm-py { padding-top:28px !important; padding-bottom:28px !important; }
    .btn-full { display:block !important; width:100% !important; box-sizing:border-box !important; }
    .sm-stack { display:block !important; width:100% !important; }
    .sm-hpad { padding-left:0 !important; padding-right:0 !important; }
    .sm-h1 { font-size:24px !important; line-height:32px !important; }
  }

  /* ---- dark mode (where supported) ----
     Flip the whole white "sheet" to a dark surface — not just the inset cards —
     so the light text overrides below always sit on a dark background. */
  @media (prefers-color-scheme: dark) {
    .email-bg, u + .email-bg { background:#0B0E1A !important; }
    .sheet { background:#141829 !important; }
    .card { background:#1C2138 !important; border-color:#2C3149 !important; }
    .panel-tint { background:#1C2138 !important; border-color:#2C3149 !important; }
    .row-tint { background:#232842 !important; }
    .connector { background:#2C3149 !important; }
    .t-primary { color:#F4F5F7 !important; }
    .t-secondary { color:#AAB0C4 !important; }
    .t-faint { color:#8A92A8 !important; }
    .hairline { border-color:#2C3149 !important; }
  }
`;

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: HEAD_CSS }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="email-bg"
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: email.color.ground,
          fontFamily: email.font.sans,
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
        }}
      >
        <Section
          style={{
            backgroundColor: "transparent",
            padding: "0",
          }}
        >
          <Container
            className="sm-full"
            style={{
              width: "100%",
              maxWidth: `${email.width}px`,
              margin: "0 auto",
              padding: "26px 16px",
            }}
          >
            {children}
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
