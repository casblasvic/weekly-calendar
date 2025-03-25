import { NextResponse } from "next/server"
import Imap from "imap"
import { simpleParser } from "mailparser"
import { Email } from "@/types/email"

export async function POST(request: Request) {
  try {
    const config = await request.json()

    // Configurar conexión IMAP
    const imap = new Imap({
      user: config.imap.username,
      password: config.imap.password,
      host: config.imap.host,
      port: config.imap.port,
      tls: config.imap.secure,
      tlsOptions: { rejectUnauthorized: false }
    })

    // Conectar y obtener correos
    const emails = await new Promise<Email[]>((resolve, reject) => {
      imap.connect((err) => {
        if (err) {
          reject(err)
          return
        }

        imap.openBox("INBOX", false, (err, box) => {
          if (err) {
            reject(err)
            return
          }

          // Buscar correos no leídos
          imap.search(["UNSEEN"], (err, results) => {
            if (err) {
              reject(err)
              return
            }

            if (!results || results.length === 0) {
              resolve([])
              return
            }

            const f = imap.fetch(results, {
              bodies: "",
              struct: true
            })

            const emails: Email[] = []

            f.on("message", (msg) => {
              msg.on("body", (stream) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    console.error("Error al parsear correo:", err)
                    return
                  }

                  // Convertir el correo al formato de la aplicación
                  const email: Email = {
                    id: parsed.messageId || Math.random().toString(),
                    from: {
                      name: parsed.from?.text || "Desconocido",
                      email: parsed.from?.address || "",
                      avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 10)}`
                    },
                    subject: parsed.subject || "Sin asunto",
                    preview: parsed.text?.substring(0, 100) || "",
                    content: parsed.text || "",
                    date: new Date(parsed.date || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    isRead: false,
                    isStarred: false,
                    isImportant: false,
                    hasAttachments: parsed.attachments.length > 0,
                    labels: [],
                    attachments: parsed.attachments.map(attachment => ({
                      name: attachment.filename || "archivo",
                      size: attachment.size || 0,
                      type: attachment.contentType || "application/octet-stream",
                      url: URL.createObjectURL(new Blob([attachment.content]))
                    }))
                  }

                  emails.push(email)
                })
              })
            })

            f.once("error", (err) => {
              console.error("Error al obtener correos:", err)
              reject(err)
            })

            f.once("end", () => {
              resolve(emails)
            })
          })
        })
      })
    })

    // Cerrar conexión
    imap.end()

    return NextResponse.json({ success: true, emails })
  } catch (error) {
    console.error("Error al sincronizar correos:", error)
    return NextResponse.json(
      { success: false, error: "Error al sincronizar correos" },
      { status: 500 }
    )
  }
} 