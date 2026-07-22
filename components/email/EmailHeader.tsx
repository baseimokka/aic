import * as React from "react";
import { Img, Section, Text } from "@react-email/components";
import { company, email, siteUrl } from "./theme";

/**
 * Navy header band: brand logo + premium tagline. The reversed (white) logo
 * sits on the navy ground; if a client blocks images the cell's white text
 * colour keeps the "AIC Travel" alt legible. Rounds only its top corners so it
 * reads as one card with the white sheet directly beneath it.
 */
export function EmailHeader() {
  return (
    <Section
      className="sm-px"
      style={{
        backgroundColor: email.color.navy,
        borderTopLeftRadius: `${email.radius.card}px`,
        borderTopRightRadius: `${email.radius.card}px`,
        padding: "34px 40px 30px",
        textAlign: "center",
      }}
    >
      <Img
        src={`${siteUrl()}/brand/aic-logo-reversed.png`}
        alt={company.name}
        width={132}
        height={64}
        style={{
          display: "block",
          margin: "0 auto",
          height: "48px",
          width: "auto",
        }}
      />
      <Text
        style={{
          margin: "16px 0 0",
          color: email.color.gold,
          fontFamily: email.font.sans,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Discover More&nbsp;·&nbsp;Travel Better
      </Text>
    </Section>
  );
}
