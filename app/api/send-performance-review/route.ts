import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Resend API key not configured" },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { parentEmail, parentName, studentName, reportName, startDate, endDate, pdfBase64 } = await request.json()

    if (!parentEmail || !studentName || !pdfBase64) {
      return NextResponse.json(
        { error: "Missing required fields: parentEmail, studentName, pdfBase64" },
        { status: 400 }
      )
    }

    // Convert base64 to buffer for attachment
    const pdfBuffer = Buffer.from(pdfBase64, "base64")
    const fileName = `Performance_Review_${studentName.replace(/\s+/g, "_")}_${startDate || "report"}.pdf`

    const { data, error } = await resend.emails.send({
      from: "SailFuture Academy <noreply@sailfutureacademy.org>",
      to: parentEmail,
      cc: ["dean@sailfuture.org", "hthompson@sailfuture.org"],
      subject: `Performance Review: ${studentName} — ${reportName || "SailFuture Academy"}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #1e293b; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">SailFuture Academy</h1>
          </div>
          <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">
              Dear ${parentName || "Parent/Guardian"},
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              Please find attached the performance review for <strong>${studentName}</strong>${startDate && endDate ? ` covering the period from <strong>${startDate}</strong> to <strong>${endDate}</strong>` : ""}.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              This review includes daily professionalism scores, evaluation summaries, and any additional notes from the reviewing staff member.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              If you have any questions about this review, please don't hesitate to reach out to us.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
              SailFuture Academy<br />
              2154 27th Ave N, Saint Petersburg, FL 33713<br />
              (727) 209-7846 · dean@sailfuture.org
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error: any) {
    console.error("Send performance review error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
