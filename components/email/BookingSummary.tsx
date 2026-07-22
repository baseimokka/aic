import * as React from "react";
import { Section, Text } from "@react-email/components";
import { email } from "./theme";

export interface SummaryItem {
  /** Small leading glyph (emoji) — rendered in every client. */
  icon: string;
  label: string;
  value: string;
}

/**
 * Booking details card. The reference is lifted into a tinted header strip with
 * a "Received" status pill (the number travellers look for first); the request
 * details follow as hairline-separated rows, each with a small icon per spec.
 * Built as a bordered card-within-the-sheet using native tables for precise,
 * client-safe control.
 */
export function BookingSummary({
  reference,
  statusLabel,
  items,
}: {
  reference: string;
  statusLabel: string;
  items: SummaryItem[];
}) {
  return (
    <Section
      className="sm-px sheet"
      style={{ backgroundColor: email.color.card, padding: "24px 40px 6px" }}
    >
      <table
        role="presentation"
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        className="card hairline"
        style={{
          width: "100%",
          border: `1px solid ${email.color.border}`,
          borderRadius: `${email.radius.card}px`,
          backgroundColor: email.color.card,
          overflow: "hidden",
        }}
      >
        {/* Reference header strip */}
        <tr>
          <td
            className="row-tint hairline"
            style={{
              backgroundColor: email.color.tint,
              borderBottom: `1px solid ${email.color.border}`,
              padding: "18px 22px",
            }}
          >
            <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Text
                    className="t-faint"
                    style={{
                      margin: 0,
                      color: email.color.textFaint,
                      fontFamily: email.font.sans,
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    Booking reference
                  </Text>
                  <Text
                    className="t-primary"
                    style={{
                      margin: "4px 0 0",
                      color: email.color.navy,
                      fontFamily: email.font.sans,
                      fontSize: "19px",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {reference}
                  </Text>
                </td>
                <td style={{ verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: email.color.successSoft,
                      color: "#166534",
                      fontFamily: email.font.sans,
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      padding: "7px 14px",
                      borderRadius: `${email.radius.chip}px`,
                    }}
                  >
                    ● {statusLabel}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        {/* Detail rows */}
        <tr>
          <td style={{ padding: "6px 22px 12px" }}>
            <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
              {items.map((item, i) => (
                <tr key={item.label}>
                  <td
                    className="hairline"
                    width={28}
                    style={{
                      width: "28px",
                      verticalAlign: "top",
                      padding: "14px 0",
                      borderTop: i === 0 ? "none" : `1px solid ${email.color.border}`,
                      fontSize: "15px",
                      lineHeight: "22px",
                    }}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                  </td>
                  <td
                    className="hairline t-secondary"
                    style={{
                      verticalAlign: "top",
                      padding: "14px 0",
                      borderTop: i === 0 ? "none" : `1px solid ${email.color.border}`,
                      color: email.color.textSecondary,
                      fontFamily: email.font.sans,
                      fontSize: "13.5px",
                      lineHeight: "22px",
                    }}
                  >
                    {item.label}
                  </td>
                  <td
                    className="hairline t-primary"
                    style={{
                      verticalAlign: "top",
                      padding: "14px 0",
                      borderTop: i === 0 ? "none" : `1px solid ${email.color.border}`,
                      textAlign: "right",
                      color: email.color.navy,
                      fontFamily: email.font.sans,
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: "22px",
                    }}
                  >
                    {item.value}
                  </td>
                </tr>
              ))}
            </table>
          </td>
        </tr>
      </table>
    </Section>
  );
}
