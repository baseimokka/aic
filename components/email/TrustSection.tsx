import * as React from "react";
import { Heading, Section } from "@react-email/components";
import { email } from "./theme";

/**
 * Reassurance panel: "why book with AIC Travel", four green-ticked promises in
 * a soft indigo-tinted card that gives the sheet a calm final beat before the
 * footer. One column so it stacks cleanly on any width.
 */
export function TrustSection({ heading, points }: { heading: string; points: string[] }) {
  return (
    <Section
      className="sm-px sheet"
      style={{ backgroundColor: email.color.card, padding: "30px 40px 34px" }}
    >
      <table
        role="presentation"
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        className="panel-tint hairline"
        style={{
          width: "100%",
          backgroundColor: email.color.tintNavy,
          border: `1px solid ${email.color.border}`,
          borderRadius: `${email.radius.card}px`,
        }}
      >
        <tr>
          <td style={{ padding: "24px 26px" }}>
            <Heading
              as="h2"
              className="t-primary"
              style={{
                margin: "0 0 14px",
                color: email.color.navy,
                fontFamily: email.font.serif,
                fontSize: "19px",
                lineHeight: "25px",
                fontWeight: 700,
              }}
            >
              {heading}
            </Heading>

            <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
              {points.map((point) => (
                <tr key={point}>
                  <td
                    width={26}
                    style={{
                      width: "26px",
                      verticalAlign: "top",
                      padding: "7px 0",
                      color: email.color.success,
                      fontFamily: email.font.sans,
                      fontSize: "15px",
                      fontWeight: 700,
                      lineHeight: "22px",
                    }}
                  >
                    ✔
                  </td>
                  <td
                    className="t-primary"
                    style={{
                      verticalAlign: "top",
                      padding: "7px 0",
                      color: email.color.navySoft,
                      fontFamily: email.font.sans,
                      fontSize: "14.5px",
                      lineHeight: "22px",
                    }}
                  >
                    {point}
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
