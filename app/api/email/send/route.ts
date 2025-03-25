import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { Email } from "@/types/email"

export async function POST(request: Request) {
  try {
    const { config, email } = await request.json()

    // Configurar el transportador SMTP
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.username,
        pass: config.smtp.password
      }
    })

    // Enviar el correo
    await transporter.sendMail({
      from: config.smtp.username,
      to: email.to?.join(", "),
      subject: email.subject,
      text: email.content,
      html: email.content
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al enviar correo:", error)
    return NextResponse.json(
      { success: false, error: "Error al enviar correo" },
      { status: 500 }
    )
  }
} 