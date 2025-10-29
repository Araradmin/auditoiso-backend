const PDFDocument = require('pdfkit');

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

module.exports = function pdfGenerator(audit) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(audit.name || 'Auditoría', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Norma: ${audit.standard}`);
    doc.text(`Auditor: ${audit.auditor || '-'}`);
    doc.text(`Fecha/Hora: ${formatDate(audit.createdAtAudit || new Date())}`);
    doc.text(`Resultado: ${audit.score?.totalAchieved || 0} / ${audit.score?.totalPossible || 0}  (${audit.score?.percent || 0}%)`);
    doc.moveDown();

    doc.fontSize(12).text('Detalles:');
    doc.moveDown(0.5);
    (audit.checklist || []).forEach((it) => {
      const status = it.passed ? 'OK' : 'NO';
      doc.fontSize(10).text(`- [${status}] (${it.weight}) ${it.text}`);
    });

    if (audit.notes) {
      doc.moveDown();
      doc.fontSize(12).text('Observaciones:');
      doc.fontSize(10).text(audit.notes);
    }

    doc.moveDown();
    doc.fontSize(9).text(`Generado: ${new Date().toLocaleString()}`);

    doc.end();
  });
};
