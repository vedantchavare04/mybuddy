import { Resend } from "resend";

type FeedbackPayload = {
  name?: unknown;
  email?: unknown;
  rating?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let payload: FeedbackPayload;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Please check the feedback details and try again.", 400);
    }
    payload = body as FeedbackPayload;
  } catch {
    return jsonError("The request could not be read. Please try again.", 400);
  }

  const { name, email, rating, message, turnstileToken } = payload;

  if (
    typeof message !== "string" ||
    message.trim().length < 5 ||
    message.length > 2000
  ) {
    return jsonError(
      "Please enter a message between 5 and 2000 characters.",
      400,
    );
  }

  if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
    return jsonError("Name is invalid.", 400);
  }

  if (
    email !== undefined &&
    email !== "" &&
    (typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return jsonError("Email is invalid.", 400);
  }

  if (
    rating !== undefined &&
    (typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5)
  ) {
    return jsonError("Rating is invalid.", 400);
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (typeof turnstileToken !== "string" || !secret) {
    return jsonError(
      secret
        ? "Please complete the security check."
        : "Feedback is temporarily unavailable. Please try again later.",
      secret ? 400 : 500,
    );
  }

  let verified: boolean;
  try {
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: turnstileToken }),
      },
    );

    if (!verificationResponse.ok) {
      return jsonError(
        "Security check is temporarily unavailable. Please try again.",
        502,
      );
    }

    const verification: unknown = await verificationResponse.json();

    verified =
      verification !== null &&
      typeof verification === "object" &&
      "success" in verification &&
      verification.success === true;
  } catch {
    return jsonError(
      "Security check is temporarily unavailable. Please try again.",
      502,
    );
  }

  if (!verified) {
    return jsonError("Security check failed. Please try again.", 403);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return jsonError(
      "Feedback is temporarily unavailable. Please try again later.",
      500,
    );
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: typeof email === "string" && email ? email : undefined,
      subject: "New MyBuddy feedback",
      text: [
        `Name: ${name || "Not provided"}`,
        `Email: ${email || "Not provided"}`,
        `Rating: ${rating || "Not provided"}`,
        "",
        "Message:",
        message.trim(),
      ].join("\n"),
    });

    if (result.error) {
      return jsonError("Could not send feedback. Please try again.", 502);
    }

    return Response.json({ success: true });
  } catch {
    return jsonError("Could not send feedback. Please try again.", 502);
  }
}
