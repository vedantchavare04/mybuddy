import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { name, email, rating, message, turnstileToken } =
      await request.json();

    if (
      typeof turnstileToken !== "string" ||
      !process.env.TURNSTILE_SECRET_KEY
    ) {
      return Response.json(
        { error: "Please complete the security check." },
        { status: 400 },
      );
    }

    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      },
    );

    if (!verificationResponse.ok) {
      return Response.json(
        { error: "Security check could not be verified. Please try again." },
        { status: 502 },
      );
    }

    const verification = await verificationResponse.json();

    if (!verification.success) {
      return Response.json(
        { error: "Security check failed. Please try again." },
        { status: 403 },
      );
    }

    if (
      typeof message !== "string" ||
      message.trim().length < 5 ||
      message.length > 2000
    ) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400 },
      );
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
      return Response.json({ error: "Name is invalid." }, { status: 400 });
    }

    if (
      email !== undefined &&
      email !== "" &&
      (typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return Response.json({ error: "Email is invalid." }, { status: 400 });
    }

    if (
      rating !== undefined &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      return Response.json({ error: "Rating is invalid." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.FEEDBACK_TO_EMAIL;
    const from = process.env.FEEDBACK_FROM_EMAIL;

    if (!apiKey || !to || !from) {
      return Response.json(
        { error: "Feedback is not configured." },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: email || undefined,
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
      return Response.json(
        { error: "Could not send feedback." },
        { status: 502 },
      );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
}
