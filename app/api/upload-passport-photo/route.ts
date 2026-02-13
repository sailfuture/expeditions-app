import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { Readable } from "stream"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")
  
  if (!email || !key) {
    throw new Error("Missing Google service account credentials")
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const personId = formData.get("person_id") as string | null
    const personType = formData.get("person_type") as string | null

    if (!file || !personId || !personType) {
      return NextResponse.json(
        { error: "Missing required fields: file, person_id, person_type" },
        { status: 400 }
      )
    }

    if (personType !== "staff" && personType !== "student") {
      return NextResponse.json(
        { error: "person_type must be 'staff' or 'student'" },
        { status: 400 }
      )
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!folderId) {
      return NextResponse.json(
        { error: "Google Drive folder ID not configured" },
        { status: 500 }
      )
    }

    // Authenticate with Google
    const auth = getAuth()
    const drive = google.drive({ version: "v3", auth })

    // Convert File to readable stream
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    // Build a descriptive filename
    const timestamp = new Date().toISOString().split("T")[0]
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `passport_${personType}_${personId}_${timestamp}_${sanitizedName}`

    // Upload to Google Drive (supportsAllDrives for Shared Drives)
    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "image/jpeg",
        body: stream,
      },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    })

    const fileId = driveResponse.data.id
    if (!fileId) {
      return NextResponse.json({ error: "Failed to upload file to Google Drive" }, { status: 500 })
    }

    // Try to make the file viewable by anyone with the link
    // This may fail on Shared Drives if the parent already has broader permissions
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
        supportsAllDrives: true,
      })
    } catch {
      // Permission already inherited from Shared Drive -- that's fine
    }

    const webViewLink = driveResponse.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

    // Update the Xano record with the Drive link
    const endpoint = personType === "staff"
      ? `/teachers/${personId}`
      : `/students/${personId}`

    const updateBody = personType === "staff"
      ? { passport_photo: webViewLink }
      : { students_id: parseInt(personId), passport_photo: webViewLink }

    const xanoRes = await fetch(`${XANO_BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateBody),
    })

    if (!xanoRes.ok) {
      console.error("Xano update failed:", await xanoRes.text())
      // Still return the URL even if Xano update fails -- user can retry
      return NextResponse.json({
        url: webViewLink,
        warning: "Photo uploaded but failed to update record. Please save manually.",
      })
    }

    return NextResponse.json({ url: webViewLink })
  } catch (error: any) {
    console.error("Upload passport photo error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { person_id, person_type, photo_url } = await request.json()

    if (!person_id || !person_type) {
      return NextResponse.json(
        { error: "Missing required fields: person_id, person_type" },
        { status: 400 }
      )
    }

    // Extract file ID from Google Drive URL
    // URLs look like: https://drive.google.com/file/d/FILE_ID/view
    if (photo_url) {
      const match = photo_url.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match) {
        const fileId = match[1]
        console.log("Attempting to delete Google Drive file:", fileId)
        const auth = getAuth()
        const drive = google.drive({ version: "v3", auth })

        // Try permanent delete first, fall back to trash
        try {
          await drive.files.delete({
            fileId,
            supportsAllDrives: true,
          })
          console.log("Google Drive file permanently deleted")
        } catch (deleteError: any) {
          console.log("Permanent delete failed, trying trash:", deleteError.message)
          try {
            await drive.files.update({
              fileId,
              requestBody: { trashed: true },
              supportsAllDrives: true,
            })
            console.log("Google Drive file moved to trash")
          } catch (trashError: any) {
            console.error("Trash also failed:", trashError.message)
            // Don't block the Xano update -- just log it
          }
        }
      } else {
        console.log("Could not extract file ID from URL:", photo_url)
      }
    } else {
      console.log("No photo_url provided for deletion")
    }

    // Clear the passport_photo field in Xano
    const endpoint = person_type === "staff"
      ? `/teachers/${person_id}`
      : `/students/${person_id}`

    const updateBody = person_type === "staff"
      ? { passport_photo: "" }
      : { students_id: parseInt(person_id), passport_photo: "" }

    const xanoRes = await fetch(`${XANO_BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateBody),
    })

    if (!xanoRes.ok) {
      const errText = await xanoRes.text()
      console.error("Xano update failed:", errText)
      return NextResponse.json({ error: "Failed to update record: " + errText }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete passport photo error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
