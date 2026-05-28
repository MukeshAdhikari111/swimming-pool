const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');

const TICKETS_DIR = path.join(__dirname, '..', 'tickets');

const ensureTicketsDir = () => {
  if (!fs.existsSync(TICKETS_DIR)) {
    fs.mkdirSync(TICKETS_DIR, { recursive: true });
  }
};

const generateTicketId = () => {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `POOL-${ymd}-${random}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTicketPdfPath = (ticketId) => path.join(TICKETS_DIR, `${ticketId}.pdf`);

const createBarcodeBuffer = (ticketId) => bwipjs.toBuffer({
  bcid: 'code128',
  text: ticketId,
  scale: 3,
  height: 14,
  includetext: true,
  textxalign: 'center'
});

const generateTicketPdf = async (visitor) => {
  ensureTicketsDir();

  const ticketId = visitor.ticket_id || generateTicketId();
  const barcodeValue = visitor.barcode_value || ticketId;
  const relativePath = path.join('tickets', `${ticketId}.pdf`).replace(/\\/g, '/');
  const absolutePath = getTicketPdfPath(ticketId);
  const barcodeBuffer = await createBarcodeBuffer(barcodeValue);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [360, 560], margin: 28 });
    const stream = fs.createWriteStream(absolutePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    doc.roundedRect(24, 24, 312, 512, 8).stroke('#cbd5e1');

    doc.circle(58, 58, 22).fill('#06b6d4');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('US', 48, 47);
    doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold').text('US Amusement Park', 88, 42);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Lamki Chuha-1, Kailali', 90, 62);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Swimming pool entry ticket', 90, 74);

    doc.moveTo(44, 96).lineTo(316, 96).stroke('#e2e8f0');

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('CUSTOMER NAME', 44, 120);
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(visitor.name || '-', 44, 136, { width: 272 });

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('TICKET ID', 44, 178);
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(ticketId, 44, 194);

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('ENTRY DATE / TIME', 44, 232);
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica').text(formatDateTime(visitor.entry_time), 44, 248);

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('PAYMENT STATUS', 44, 286);
    doc.roundedRect(44, 302, 92, 26, 6).fill(visitor.payment_status === 'Paid' ? '#dcfce7' : '#fef3c7');
    doc.fillColor(visitor.payment_status === 'Paid' ? '#166534' : '#92400e')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(visitor.payment_status || 'Pending', 58, 309);

    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('BARCODE', 44, 362);
    doc.image(barcodeBuffer, 44, 382, { width: 272 });

    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Show this ticket at the pool desk for verification.', 44, 500, {
      align: 'center',
      width: 272
    });

    doc.end();
  });

  return {
    ticketId,
    barcodeValue,
    relativePath,
    absolutePath
  };
};

module.exports = {
  TICKETS_DIR,
  ensureTicketsDir,
  generateTicketId,
  generateTicketPdf,
  getTicketPdfPath
};
