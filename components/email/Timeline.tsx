import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { email } from "./theme";

export interface TimelineStep {
  title: string;
  body: string;
  /** First (achieved) step renders a green check; others render their number. */
  done?: boolean;
}

/**
 * "What happens next" — a vertical timeline of numbered badges joined by a
 * connector line. Step one is shown complete (green check) to acknowledge the
 * just-received request; the rest are upcoming. Native tables keep the badges
 * and connectors aligned across clients.
 */
export function Timeline({ heading, steps }: { heading: string; steps: TimelineStep[] }) {
  return (
    <Section
      className="sm-px sheet"
      style={{ backgroundColor: email.color.card, padding: "30px 40px 6px" }}
    >
      <Heading
        as="h2"
        className="t-primary"
        style={{
          margin: "0 0 18px",
          color: email.color.navy,
          fontFamily: email.font.serif,
          fontSize: "20px",
          lineHeight: "26px",
          fontWeight: 700,
        }}
      >
        {heading}
      </Heading>

      <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          const done = step.done;
          return (
            <tr key={step.title}>
              {/* Badge + connector */}
              <td width={46} style={{ width: "46px", verticalAlign: "top" }}>
                <table role="presentation" border={0} cellPadding={0} cellSpacing={0}>
                  <tr>
                    <td
                      style={{
                        width: "34px",
                        height: "34px",
                        backgroundColor: done ? email.color.success : email.color.navy,
                        borderRadius: "50%",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: email.color.white,
                        fontFamily: email.font.sans,
                        fontSize: done ? "17px" : "14px",
                        fontWeight: 700,
                        lineHeight: "34px",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </td>
                  </tr>
                  {!last && (
                    <tr>
                      <td style={{ textAlign: "center", padding: 0, height: "26px" }}>
                        <div
                          className="connector"
                          style={{
                            width: "2px",
                            height: "26px",
                            margin: "0 auto",
                            backgroundColor: email.color.border,
                            lineHeight: "26px",
                            fontSize: "1px",
                          }}
                        >
                          &nbsp;
                        </div>
                      </td>
                    </tr>
                  )}
                </table>
              </td>

              {/* Content */}
              <td style={{ verticalAlign: "top", paddingBottom: last ? "2px" : "6px" }}>
                <Text
                  className="t-primary"
                  style={{
                    margin: "6px 0 0",
                    color: email.color.navy,
                    fontFamily: email.font.sans,
                    fontSize: "15px",
                    fontWeight: 700,
                    lineHeight: "20px",
                  }}
                >
                  {step.title}
                </Text>
                <Text
                  className="t-secondary"
                  style={{
                    margin: "4px 0 0",
                    color: email.color.textSecondary,
                    fontFamily: email.font.sans,
                    fontSize: "14px",
                    lineHeight: "21px",
                  }}
                >
                  {step.body}
                </Text>
              </td>
            </tr>
          );
        })}
      </table>
    </Section>
  );
}
