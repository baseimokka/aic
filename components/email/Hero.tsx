import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { email } from "./theme";

/**
 * Success hero: a haloed green check, confirmation headline, and reassurance
 * copy. The check is built from nested tables so it renders as a filled circle
 * in Apple Mail / Gmail / mobile (degrades to a rounded square in legacy
 * Outlook, still legible). Rounded-corner support aside, no images are needed.
 */
export function Hero({
  headline,
  lead,
  body,
}: {
  headline: string;
  lead: string;
  body: string;
}) {
  return (
    <Section
      className="sm-px sheet"
      style={{
        backgroundColor: email.color.card,
        padding: "40px 40px 8px",
        textAlign: "center",
      }}
    >
      {/* Haloed success check (bulletproof nested tables) */}
      <table
        role="presentation"
        align="center"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={{ margin: "0 auto" }}
      >
        <tr>
          <td
            style={{
              width: "92px",
              height: "92px",
              backgroundColor: email.color.successSoft,
              borderRadius: "50%",
              textAlign: "center",
              verticalAlign: "middle",
            }}
          >
            <table
              role="presentation"
              align="center"
              border={0}
              cellPadding={0}
              cellSpacing={0}
              style={{ margin: "0 auto" }}
            >
              <tr>
                <td
                  style={{
                    width: "62px",
                    height: "62px",
                    backgroundColor: email.color.success,
                    borderRadius: "50%",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: email.color.white,
                    fontFamily: email.font.sans,
                    fontSize: "34px",
                    fontWeight: 700,
                    lineHeight: "62px",
                  }}
                >
                  ✓
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <Heading
        as="h1"
        className="sm-h1 t-primary"
        style={{
          margin: "26px 0 0",
          color: email.color.navy,
          fontFamily: email.font.serif,
          fontSize: "29px",
          lineHeight: "36px",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {headline}
      </Heading>

      <Text
        className="t-primary"
        style={{
          margin: "14px 0 0",
          color: email.color.navy,
          fontFamily: email.font.sans,
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: 600,
        }}
      >
        {lead}
      </Text>

      <Text
        className="t-secondary"
        style={{
          margin: "10px auto 0",
          maxWidth: "440px",
          color: email.color.textSecondary,
          fontFamily: email.font.sans,
          fontSize: "15px",
          lineHeight: "24px",
        }}
      >
        {body}
      </Text>
    </Section>
  );
}
