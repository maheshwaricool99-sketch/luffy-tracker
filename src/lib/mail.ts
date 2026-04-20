type MailInput = {
  to: string;
  subject: string;
  html: string;
};

function hasMailerConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(input: MailInput) {
  if (!hasMailerConfig()) {
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_EMAIL_PREVIEW === "true") {
      return { delivered: false, preview: true };
    }

    throw new Error("Email delivery is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with ${response.status}`);
  }

  return { delivered: true, preview: false };
}
