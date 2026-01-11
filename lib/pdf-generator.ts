import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getPerformanceReviewById, getProfessionalismByStudentAndDate } from './xano'

// School header information
const SCHOOL_INFO = {
  name: 'SailFuture Academy',
  address: '2154 27th Ave N, Saint Petersburg, FL 33713',
  phone: '(727) 209-7846',
  email: 'dean@sailfuture.org',
}

// Helper function to load image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg'))
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

// Add school header to PDF - returns the Y position after the header
export async function addPDFHeader(doc: jsPDF): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth()
  const leftMargin = 14
  
  // Try to load and add the logo image
  try {
    const logoBase64 = await loadImageAsBase64('/SFALogoWhite.jpg')
    // Add logo image (22x22mm square)
    doc.addImage(logoBase64, 'JPEG', leftMargin, 8, 22, 22)
  } catch (error) {
    console.error('Failed to load logo image:', error)
    // Fallback: Draw logo background with text
    doc.setFillColor(30, 41, 59) // slate-800
    doc.roundedRect(leftMargin, 8, 22, 22, 2, 2, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('SAILFUTURE', leftMargin + 11, 17, { align: 'center' })
    doc.setFontSize(5)
    doc.text('ACADEMY', leftMargin + 11, 22, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }
  
  // School name and details - positioned to the right of logo, left justified
  const textX = leftMargin + 26
  
  // All text same size (9pt)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(SCHOOL_INFO.name, textX, 14)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(75, 85, 99) // gray-600
  doc.text(SCHOOL_INFO.address, textX, 20)
  doc.text(`${SCHOOL_INFO.phone}  •  ${SCHOOL_INFO.email}`, textX, 26)
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Draw separator line
  doc.setDrawColor(229, 231, 235) // gray-200
  doc.setLineWidth(0.5)
  doc.line(leftMargin, 34, pageWidth - leftMargin, 34)
  
  return 44 // Return Y position after header
}

export async function generatePerformanceReviewPDF(reviewId: number) {
  // Fetch the full review data by ID
  const review = await getPerformanceReviewById(reviewId)
  
  // Fetch daily scores for this student and date range
  let dailyScores: any[] = []
  if (review.students_id && review.expeditions_id && review.startDate && review.endDate) {
    try {
      dailyScores = await getProfessionalismByStudentAndDate(
        review.students_id,
        review.expeditions_id,
        review.startDate,
        review.endDate
      )
      // Sort by date
      dailyScores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } catch (error) {
      console.error('Error fetching daily scores:', error)
    }
  }
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const leftMargin = 14
  
  // Add school header
  let yPosition = await addPDFHeader(doc)
  
  // Add top padding before title
  yPosition += 6
  
  // Title - left justified
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Performance Review', leftMargin, yPosition)
  yPosition += 8
  
  // Expedition name (handle if not present) - left justified
  if (review._expeditions?.name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    doc.text(review._expeditions.name, leftMargin, yPosition)
    yPosition += 10
  } else {
    yPosition += 5
  }
  
  // Reset text color
  doc.setTextColor(0, 0, 0)
  
  // Student Information Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Student Information', 14, yPosition)
  yPosition += 8
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const studentName = `${review._students?.firstName || ""} ${review._students?.lastName || ""}`.trim() || `Student ID: ${review.students_id}`
  doc.text(`Student Name: ${studentName}`, 14, yPosition)
  yPosition += 6
  doc.text(`Report Name: ${review.report_name || 'Untitled'}`, 14, yPosition)
  yPosition += 6
  doc.text(`Review Period: ${formatDate(review.startDate)} - ${formatDate(review.endDate)}`, 14, yPosition)
  yPosition += 12
  
  // Performance Scores Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Scores', 14, yPosition)
  yPosition += 8
  
  // Create table data
  const tableData = [
    ['Academics', formatScore(review.academics), review.academics_evaluation || '—'],
    ['Citizenship', formatScore(review.citizenship), review.citizenship_evaluation || '—'],
    ['Job Duties', formatScore(review.job), review.job_evaluation || '—'],
    ['Crew Responsibilities', formatScore(review.crew), review.crew_evaluation || '—'],
    ['Service Learning', formatScore(review.service), review.service_evaluation || '—'],
    ['Journaling', formatJournaling(review.journaling), review.journaling_evaluation || '—'],
  ]
  
  // Helper function to get color based on score
  const getScoreColor = (score: number | null | undefined): [number, number, number] | null => {
    if (score === null || score === undefined) return null
    if (score >= 3.21) return [219, 234, 254] // blue-100
    if (score >= 2.751) return [220, 252, 231] // green-100
    if (score >= 2.251) return [254, 249, 195] // yellow-100
    if (score >= 1.1) return [254, 226, 226] // red-100
    return [243, 244, 246] // gray-100
  }

  // Helper to get journaling color based on percentage
  const getJournalingColor = (decimal: number | null | undefined): [number, number, number] | null => {
    if (decimal === null || decimal === undefined) return null
    const pct = decimal * 100
    if (pct >= 80) return [220, 252, 231] // green-100
    if (pct >= 60) return [254, 249, 195] // yellow-100
    if (pct >= 40) return [254, 215, 170] // orange-100
    return [254, 226, 226] // red-100
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Score', 'Evaluation']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [55, 65, 81],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 80 },
    },
    didParseCell: (data) => {
      // Color code score cells based on evaluation ranges
      if (data.section === 'body' && data.column.index === 1) {
        const rowIndex = data.row.index
        let score: number | null = null
        
        // Get the actual score from the review data
        switch (rowIndex) {
          case 0: score = review.academics; break
          case 1: score = review.citizenship; break
          case 2: score = review.job; break
          case 3: score = review.crew; break
          case 4: score = review.service; break
          case 5: // Journaling - use percentage-based color
            const jrnlColor = getJournalingColor(review.journaling)
            if (jrnlColor) {
              data.cell.styles.fillColor = jrnlColor
            }
            return
        }
        
        const color = getScoreColor(score)
        if (color) {
          data.cell.styles.fillColor = color
        }
      }
    },
  })
  
  // Get the final Y position after the table
  yPosition = (doc as any).lastAutoTable.finalY + 15
  
  // Daily Scores Section
  if (dailyScores.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Daily Scores', 14, yPosition)
    yPosition += 8
    
    // Create daily scores table data
    const dailyTableData = dailyScores.map((score: any) => [
      formatDateShort(score.date),
      formatDailyScore(score.academics),
      formatDailyScore(score.citizenship),
      formatDailyScore(score.job),
      formatDailyScore(score.crew),
      formatDailyScore(score.service),
      score.journaling || score.note || score._expedition_journal_status?.name || '—',
    ])
    
    // Helper function to get journal status color
    const getJournalStatusColor = (status: string): [number, number, number] | null => {
      const lower = status.toLowerCase()
      // Check red conditions first (not started, missing)
      if (lower.includes('not started') || lower.includes('not') || lower.includes('missing')) return [254, 226, 226] // red-100
      // Check green (completed/complete)
      if (lower === 'completed' || lower === 'complete') return [220, 252, 231] // green-100
      // Check yellow (incomplete, partial, late, started)
      if (lower.includes('incomplete') || lower.includes('partial') || lower.includes('started') || lower.includes('late')) return [254, 249, 195] // yellow-100
      return null
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Acad', 'Citz', 'Job', 'Crew', 'Serv', 'Jrnl']],
      body: dailyTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [55, 65, 81],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81],
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 'auto' },
      },
      tableWidth: 'auto',
      margin: { left: leftMargin, right: leftMargin },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      didParseCell: (data) => {
        // Color code cells based on score
        if (data.section === 'body' && data.column.index > 0 && data.column.index < 6) {
          const value = parseFloat(data.cell.text[0])
          if (!isNaN(value)) {
            if (value >= 4) {
              data.cell.styles.fillColor = [219, 234, 254] // blue-100
            } else if (value >= 3) {
              data.cell.styles.fillColor = [220, 252, 231] // green-100
            } else if (value >= 2) {
              data.cell.styles.fillColor = [254, 249, 195] // yellow-100
            } else if (value >= 1) {
              data.cell.styles.fillColor = [254, 226, 226] // red-100
            } else if (value >= 0) {
              data.cell.styles.fillColor = [243, 244, 246] // gray-100
            }
          }
        }
        // Color code journaling column (index 6)
        if (data.section === 'body' && data.column.index === 6) {
          const status = data.cell.text[0]
          if (status && status !== '—') {
            const color = getJournalStatusColor(status)
            if (color) {
              data.cell.styles.fillColor = color
            }
          }
        }
      },
    })
    
    yPosition = (doc as any).lastAutoTable.finalY + 15
  }
  
  // Notes Section
  if (review.notes) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', 14, yPosition)
    yPosition += 8
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const splitNotes = doc.splitTextToSize(review.notes, pageWidth - 28)
    doc.text(splitNotes, 14, yPosition)
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    )
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    )
  }
  
  // Download the PDF
  const studentNameForFile = `${review._students?.firstName || ""} ${review._students?.lastName || ""}`.trim() || `Student_${review.students_id}`
  const fileName = `${studentNameForFile.replace(/\s+/g, '_')}_Performance_Review_${review.id}.pdf`
  doc.save(fileName)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${months[month - 1]} ${day}`
  } catch {
    return dateStr
  }
}

function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—'
  return score.toFixed(2)
}

function formatDailyScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—'
  return score.toString()
}

function formatJournaling(decimal: number | null | undefined): string {
  if (decimal === null || decimal === undefined) return '—'
  return `${Math.round(decimal * 100)}%`
}

