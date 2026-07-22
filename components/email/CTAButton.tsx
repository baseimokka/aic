import * as React from "react";
import { Button, Section } from "@react-email/components";
import { email } from "./theme";

/**
 * Reusable premium button. Primary = sunset-orange fill (CTA), secondary =
 * outlined navy. Full-width on mobile (`btn-full`) and hover-darkens where the
 * client supports `:hover` (`btn-primary`). React Email's <Button> injects the
 * MSO padding hack so the hit area survives Outlook.
 */
export function CTAButton({
  href,
  label,
  variant = "primary",
  align = "center",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  align?: "center" | "left";
}) {
  const primary = variant === "primary";
  return (
    <Section
      className="sm-px sheet"
      style={{
        backgroundColor: email.color.card,
        padding: "26px 40px 8px",
        textAlign: align,
      }}
    >
      <Button
        href={href}
        className={primary ? "btn-primary btn-full" : "btn-full"}
        style={{
          backgroundColor: primary ? email.color.accent : "transparent",
          color: primary ? email.color.white : email.color.navy,
          border: primary ? "none" : `1.5px solid ${email.color.border}`,
          borderRadius: `${email.radius.button}px`,
          fontFamily: email.font.sans,
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          padding: "15px 34px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {label}
      </Button>
    </Section>
  );
}
