import PDFDocument from 'pdfkit';
import { Response } from 'express';
import type { Challan, ChallanItem, Customer, User } from '@prisma/client';

type ChallanWithRelations = Challan & {
  items: ChallanItem[];
  customer: Pick<Customer, 'name' | 'mobile' | 'businessName' | 'address'>;
  createdBy: Pick<User, 'name'>;
};

export function streamChallanPdf(res: Response, challan: ChallanWithRelations): void {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${challan.challanNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('Sales Challan', { align: 'right' });
  doc.fontSize(10).fillColor('#555').text(challan.challanNumber, { align: 'right' });
  doc.moveDown(2);

  doc.fillColor('#000').fontSize(12).text('Bill To:');
  doc.fontSize(10).text(challan.customer.name);
  if (challan.customer.businessName) doc.text(challan.customer.businessName);
  doc.text(challan.customer.mobile);
  if (challan.customer.address) doc.text(challan.customer.address);
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Status: ${challan.status}`);
  doc.text(`Created by: ${challan.createdBy.name}`);
  doc.text(`Date: ${challan.createdAt.toDateString()}`);
  doc.moveDown(1.5);

  const startX = doc.x;
  let y = doc.y;
  const columns = [
    { label: 'Product', width: 190 },
    { label: 'SKU', width: 90 },
    { label: 'Unit Price', width: 80 },
    { label: 'Qty', width: 50 },
    { label: 'Line Total', width: 90 },
  ];

  function drawRow(values: string[], opts: { bold?: boolean } = {}) {
    let x = startX;
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    values.forEach((value, i) => {
      doc.text(value, x, y, { width: columns[i].width, align: i >= 2 ? 'right' : 'left' });
      x += columns[i].width;
    });
    y += 20;
  }

  drawRow(
    columns.map((c) => c.label),
    { bold: true },
  );
  doc
    .moveTo(startX, y - 4)
    .lineTo(startX + columns.reduce((sum, c) => sum + c.width, 0), y - 4)
    .stroke();

  let totalQuantity = 0;
  for (const item of challan.items) {
    drawRow([
      item.productName,
      item.productSku,
      item.unitPrice.toFixed(2),
      String(item.quantity),
      item.lineTotal.toFixed(2),
    ]);
    totalQuantity += item.quantity;
  }

  doc.moveTo(startX, y).lineTo(startX + columns.reduce((sum, c) => sum + c.width, 0), y).stroke();
  y += 10;
  doc.y = y;

  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Total Quantity: ${totalQuantity}`, { align: 'right' });
  doc.text(`Total Amount: ${challan.totalAmount.toFixed(2)}`, { align: 'right' });

  doc.end();
}
