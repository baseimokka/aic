import * as React from "react";
import { Hr, Link, Section, Text } from "@react-email/components";
import { company, email, siteUrl } from "./theme";

const linkStyle: React.CSSProperties = {
  color: email.color.onNavy,
  fontFamily: email.font.sans,
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
};

/** A small circular social badge holding an inline SVG glyph (white on navy). */
function SocialBadge({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-block",
        width: "36px",
        height: "36px",
        lineHeight: "36px",
        textAlign: "center",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.10)",
        margin: "0 5px",
      }}
    >
      {children}
    </a>
  );
}

/**
 * Navy footer band: contact channels, social links, co-branding, and the
 * required automated-email disclaimer. Rounded on all corners since it sits as
 * its own block below the white sheet.
 */
export function Footer() {
  const site = siteUrl();
  return (
    <Section
      className="sm-px"
      style={{
        backgroundColor: email.color.navy,
        borderBottomLeftRadius: `${email.radius.card}px`,
        borderBottomRightRadius: `${email.radius.card}px`,
        padding: "34px 40px 30px",
        textAlign: "center",
      }}
    >
      <Text
        style={{
          margin: "0 0 2px",
          color: email.color.white,
          fontFamily: email.font.serif,
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {company.name}
      </Text>
      <Text
        style={{
          margin: "0 0 18px",
          color: email.color.gold,
          fontFamily: email.font.sans,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {company.partner}
      </Text>

      {/* Contact channels */}
      <Text style={{ margin: "0 0 8px" }}>
        <Link className="link-underline" href={`tel:${company.phoneE164}`} style={linkStyle}>
          {company.phoneDisplay}
        </Link>
      </Text>
      <Text style={{ margin: "0 0 8px" }}>
        <Link className="link-underline" href={`mailto:${company.email}`} style={linkStyle}>
          {company.email}
        </Link>
      </Text>
      <Text style={{ margin: "0 0 20px" }}>
        <Link className="link-underline" href={site} style={linkStyle}>
          {company.websiteDisplay}
        </Link>
      </Text>

      {/* Social */}
      <table role="presentation" align="center" border={0} cellPadding={0} cellSpacing={0} style={{ margin: "0 auto 20px" }}>
        <tr>
          <td>
            <SocialBadge href={company.social.instagram} label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.9} style={{ verticalAlign: "middle" }} aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="#ffffff" stroke="none" />
              </svg>
            </SocialBadge>
          </td>
          <td>
            <SocialBadge href={company.social.facebook} label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style={{ verticalAlign: "middle" }} aria-hidden="true">
                <path d="M14 8.5h2.2V5.6c-.4-.05-1.6-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3v2.2H7v3.1h2.6V22h3.2v-6.8h2.5l.4-3.1h-2.9V10c0-.9.3-1.5 1.6-1.5z" />
              </svg>
            </SocialBadge>
          </td>
          <td>
            <SocialBadge href={company.whatsapp} label="WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style={{ verticalAlign: "middle" }} aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.5-5.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
              </svg>
            </SocialBadge>
          </td>
        </tr>
      </table>

      <Hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.14)", margin: "0 0 16px" }} />

      <Text
        style={{
          margin: "0 0 8px",
          color: email.color.onNavySoft,
          fontFamily: email.font.sans,
          fontSize: "12px",
          lineHeight: "18px",
        }}
      >
        © {new Date().getFullYear()} {company.name}. {company.partner}. All rights reserved.
      </Text>
      <Text
        style={{
          margin: 0,
          color: email.color.onNavyFaint,
          fontFamily: email.font.sans,
          fontSize: "11.5px",
          lineHeight: "18px",
        }}
      >
        This is an automated confirmation email — please don&apos;t reply directly.
        <br />
        Reach us anytime at{" "}
        <Link href={`mailto:${company.email}`} style={{ color: email.color.onNavySoft, textDecoration: "underline" }}>
          {company.email}
        </Link>
        .
      </Text>
    </Section>
  );
}
