import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { DerivedTrip } from '../db/schema';

interface PdfSummary {
  month: string;
  vehicleId: string;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  driverSummaries: Array<{
    driverName: string;
    totalKm: number;
    businessKm: number;
    privateKm: number;
    tripCount: number;
  }>;
  trips: Array<{
    date: string;
    driver: string;
    from: string;
    to: string;
    km: number;
    purpose: string;
  }>;
}

export async function generatePdf(
  trips: DerivedTrip[],
  drivers: Map<string, string>,
  month: string,
  vehicleId: string,
): Promise<Uint8Array> {
  // Build summary data
  const completedTrips = trips.filter((t) => t.km !== null && t.km >= 0);
  const totalKm = completedTrips.reduce((sum, t) => sum + (t.km ?? 0), 0);
  const businessKm = completedTrips
    .filter((t) => t.purpose === 'BUSINESS')
    .reduce((sum, t) => sum + (t.km ?? 0), 0);
  const privateKm = totalKm - businessKm;

  // Driver summaries
  const driverMap = new Map<string, { totalKm: number; businessKm: number; privateKm: number; tripCount: number }>();
  for (const trip of completedTrips) {
    const existing = driverMap.get(trip.driverId) || { totalKm: 0, businessKm: 0, privateKm: 0, tripCount: 0 };
    existing.totalKm += trip.km ?? 0;
    if (trip.purpose === 'BUSINESS') existing.businessKm += trip.km ?? 0;
    else existing.privateKm += trip.km ?? 0;
    existing.tripCount++;
    driverMap.set(trip.driverId, existing);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4
  let y = 800;
  const margin = 50;
  const pageWidth = 595 - 2 * margin;

  const drawText = (text: string, x: number, yPos: number, size = 10, bold = false) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
  };

  const addNewPageIfNeeded = () => {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
  };

  // Title
  drawText('Car LogBook — Monthly Summary', margin, y, 18, true);
  y -= 25;
  drawText(`Month: ${month}     Vehicle: ${vehicleId}`, margin, y, 12);
  y -= 30;

  // Overall summary
  drawText('Overall Summary', margin, y, 14, true);
  y -= 18;
  drawText(`Total Distance: ${totalKm} km`, margin, y);
  y -= 15;
  drawText(`Business: ${businessKm} km    Private: ${privateKm} km`, margin, y);
  y -= 15;
  drawText(`Completed Trips: ${completedTrips.length}`, margin, y);
  y -= 25;

  // Driver summaries
  drawText('Summary by Driver', margin, y, 14, true);
  y -= 18;
  for (const [driverId, stats] of driverMap) {
    addNewPageIfNeeded();
    const name = drivers.get(driverId) || driverId;
    drawText(
      `${name}: ${stats.totalKm} km (${stats.tripCount} trips) — Business: ${stats.businessKm} km, Private: ${stats.privateKm} km`,
      margin,
      y,
    );
    y -= 15;
  }
  y -= 15;

  // Trip details
  addNewPageIfNeeded();
  drawText('Trip Details', margin, y, 14, true);
  y -= 18;

  // Table header
  drawText('Date', margin, y, 9, true);
  drawText('Driver', margin + 70, y, 9, true);
  drawText('From', margin + 150, y, 9, true);
  drawText('To', margin + 260, y, 9, true);
  drawText('KM', margin + 370, y, 9, true);
  drawText('Purpose', margin + 410, y, 9, true);
  y -= 3;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + pageWidth, y }, thickness: 0.5 });
  y -= 12;

  for (const trip of completedTrips) {
    addNewPageIfNeeded();
    const date = new Date(trip.tripStartEvent.createdAt).toLocaleDateString('en-CA');
    const driverName = (drivers.get(trip.driverId) || trip.driverId).substring(0, 15);
    const from = trip.fromText.substring(0, 18);
    const to = (trip.toText ?? '').substring(0, 18);

    drawText(date, margin, y, 8);
    drawText(driverName, margin + 70, y, 8);
    drawText(from, margin + 150, y, 8);
    drawText(to, margin + 260, y, 8);
    drawText(String(trip.km ?? '-'), margin + 370, y, 8);
    drawText(trip.purpose, margin + 410, y, 8);
    y -= 13;
  }

  // Footer
  y -= 20;
  addNewPageIfNeeded();
  drawText(`Generated: ${new Date().toISOString()}`, margin, y, 8);

  return pdfDoc.save();
}

export function downloadPdf(data: Uint8Array, filename: string): void {
  const blob = new Blob([data as unknown as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
