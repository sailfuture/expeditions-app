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

// Add school header to PDF - returns the Y position after the header
export function addPDFHeader(doc: jsPDF): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const leftMargin = 14
  
  // Draw logo background (rounded rectangle) - smaller size
  doc.setFillColor(30, 41, 59) // slate-800
  doc.roundedRect(leftMargin, 10, 18, 18, 2, 2, 'F')
  
  // Add "SF" text as logo placeholder (since we can't easily embed the actual image)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('SAILFUTURE', leftMargin + 9, 17, { align: 'center' })
  doc.setFontSize(5)
  doc.text('ACADEMY', leftMargin + 9, 22, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  
  // School name and details - positioned to the right of logo, left justified
  const textX = leftMargin + 22
  
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
  doc.line(leftMargin, 32, pageWidth - leftMargin, 32)
  
  return 40 // Return Y position after header
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
  
  // Add school header
  let yPosition = addPDFHeader(doc)
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Review', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8
  
  // Expedition name (handle if not present)
  if (review._expeditions?.name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(review._expeditions.name, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 10
  } else {
    yPosition += 5
  }
  
  // Student Information Section
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Student Information', 14, yPosition)
  yPosition += 8
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const studentName = review._students?.name || `Student ID: ${review.students_id}`
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
      score.journal !== null && score.journal !== undefined ? `${Math.round(score.journal)}%` : '—',
    ])
    
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
        0: { halign: 'left', cellWidth: 30 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      didParseCell: (data) => {
        // Color code cells based on score
        if (data.section === 'body' && data.column.index > 0) {
          const value = parseFloat(data.cell.text[0])
          if (!isNaN(value)) {
            if (value >= 3.21) {
              data.cell.styles.fillColor = [219, 234, 254] // blue-100
            } else if (value >= 2.751) {
              data.cell.styles.fillColor = [220, 252, 231] // green-100
            } else if (value >= 2.251) {
              data.cell.styles.fillColor = [254, 249, 195] // yellow-100
            } else if (value >= 1.1) {
              data.cell.styles.fillColor = [254, 226, 226] // red-100
            } else if (value >= 0) {
              data.cell.styles.fillColor = [243, 244, 246] // gray-100
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
  const studentNameForFile = review._students?.name || `Student_${review.students_id}`
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

function formatJournaling(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) return '—'
  return `${Math.round(percentage)}%`
}

