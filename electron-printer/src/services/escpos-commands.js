/**
 * ESC/POS Commands for thermal printers
 * Reference: https://reference.epson-biz.com/modules/ref_escpos/
 */

const ESC = 0x1B;
const GS = 0x1D;
const FS = 0x1C;
const LF = 0x0A;
const CR = 0x0D;

const ESCPOS = {
  // Hardware
  HW_INIT: Buffer.from([ESC, 0x40]), // Initialize printer
  HW_RESET: Buffer.from([ESC, 0x3F, LF, 0x00]), // Reset printer
  
  // Cash drawer
  CD_KICK_2: Buffer.from([ESC, 0x70, 0x00, 0x19, 0xFA]), // Kick drawer pin 2
  CD_KICK_5: Buffer.from([ESC, 0x70, 0x01, 0x19, 0xFA]), // Kick drawer pin 5
  
  // Paper
  PAPER_FULL_CUT: Buffer.from([GS, 0x56, 0x00]), // Full cut
  PAPER_PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]), // Partial cut
  PAPER_CUT_A: Buffer.from([GS, 0x56, 0x41, 0x03]), // Cut with feed
  
  // Text formatting
  TXT_NORMAL: Buffer.from([ESC, 0x21, 0x00]), // Normal text
  TXT_BOLD_ON: Buffer.from([ESC, 0x45, 0x01]), // Bold on
  TXT_BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]), // Bold off
  TXT_UNDERL_ON: Buffer.from([ESC, 0x2D, 0x01]), // Underline on
  TXT_UNDERL_OFF: Buffer.from([ESC, 0x2D, 0x00]), // Underline off
  TXT_UNDERL2_ON: Buffer.from([ESC, 0x2D, 0x02]), // Underline 2 on
  TXT_INVERT_ON: Buffer.from([GS, 0x42, 0x01]), // Invert on
  TXT_INVERT_OFF: Buffer.from([GS, 0x42, 0x00]), // Invert off
  
  // Font size
  TXT_SIZE_NORMAL: Buffer.from([GS, 0x21, 0x00]), // Normal size
  TXT_SIZE_2H: Buffer.from([GS, 0x21, 0x01]), // Double height
  TXT_SIZE_2W: Buffer.from([GS, 0x21, 0x10]), // Double width
  TXT_SIZE_2X: Buffer.from([GS, 0x21, 0x11]), // Double width + height
  TXT_SIZE_3H: Buffer.from([GS, 0x21, 0x02]), // Triple height
  TXT_SIZE_3W: Buffer.from([GS, 0x21, 0x20]), // Triple width
  TXT_SIZE_3X: Buffer.from([GS, 0x21, 0x22]), // Triple width + height
  TXT_SIZE_4H: Buffer.from([GS, 0x21, 0x03]), // Quadruple height
  TXT_SIZE_4W: Buffer.from([GS, 0x21, 0x30]), // Quadruple width
  TXT_SIZE_4X: Buffer.from([GS, 0x21, 0x33]), // Quadruple width + height
  
  // Text alignment
  TXT_ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]), // Left align
  TXT_ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]), // Center align
  TXT_ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]), // Right align
  
  // Font type
  TXT_FONT_A: Buffer.from([ESC, 0x4D, 0x00]), // Font A (12x24)
  TXT_FONT_B: Buffer.from([ESC, 0x4D, 0x01]), // Font B (9x17)
  TXT_FONT_C: Buffer.from([ESC, 0x4D, 0x02]), // Font C (optional)
  
  // Character spacing
  TXT_SPACING_DEFAULT: Buffer.from([ESC, 0x20, 0x00]), // Default spacing
  
  // Line spacing
  LINE_SPACING_DEFAULT: Buffer.from([ESC, 0x32]), // Default line spacing
  LINE_SPACING_SET: (n) => Buffer.from([ESC, 0x33, n]), // Set line spacing to n/180 inch
  
  // Barcode
  BARCODE_TXT_OFF: Buffer.from([GS, 0x48, 0x00]), // HRI off
  BARCODE_TXT_ABV: Buffer.from([GS, 0x48, 0x01]), // HRI above
  BARCODE_TXT_BLW: Buffer.from([GS, 0x48, 0x02]), // HRI below
  BARCODE_TXT_BTH: Buffer.from([GS, 0x48, 0x03]), // HRI both
  BARCODE_HEIGHT: (n) => Buffer.from([GS, 0x68, n]), // Barcode height
  BARCODE_WIDTH: (n) => Buffer.from([GS, 0x77, n]), // Barcode width (2-6)
  BARCODE_FONT_A: Buffer.from([GS, 0x66, 0x00]), // Font A for HRI
  BARCODE_FONT_B: Buffer.from([GS, 0x66, 0x01]), // Font B for HRI
  
  // Barcode types
  BARCODE_UPC_A: 0x41,
  BARCODE_UPC_E: 0x42,
  BARCODE_EAN13: 0x43,
  BARCODE_EAN8: 0x44,
  BARCODE_CODE39: 0x45,
  BARCODE_ITF: 0x46,
  BARCODE_CODABAR: 0x47,
  BARCODE_CODE93: 0x48,
  BARCODE_CODE128: 0x49,
  
  // QR Code
  QRCODE_MODEL1: Buffer.from([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x31, 0x00]),
  QRCODE_MODEL2: Buffer.from([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
  QRCODE_SIZE: (n) => Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, n]),
  QRCODE_CORRECTION_L: Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]),
  QRCODE_CORRECTION_M: Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]),
  QRCODE_CORRECTION_Q: Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x32]),
  QRCODE_CORRECTION_H: Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x33]),
  
  // Image
  IMAGE_MODE: Buffer.from([GS, 0x76, 0x30, 0x00]), // Raster image mode
  
  // Beep
  BEEP: Buffer.from([ESC, 0x42, 0x05, 0x09]), // Beep 5 times
};

// Helper to create text command
function textCommand(text, encoding = 'cp860') {
  return Buffer.from(text, encoding);
}

// Helper to create line feed
function lineFeed(lines = 1) {
  return Buffer.alloc(lines, LF);
}

// Helper to print barcode
function barcodeCommand(type, data) {
  const typeCode = type;
  const dataBuffer = Buffer.from(data);
  return Buffer.concat([
    Buffer.from([GS, 0x6B, typeCode, dataBuffer.length]),
    dataBuffer
  ]);
}

// Helper to store QR code data
function qrCodeData(data) {
  const dataBuffer = Buffer.from(data);
  const pL = (dataBuffer.length + 3) % 256;
  const pH = Math.floor((dataBuffer.length + 3) / 256);
  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]),
    dataBuffer
  ]);
}

// Helper to print stored QR code
function qrCodePrint() {
  return Buffer.from([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
}

module.exports = {
  ESCPOS,
  textCommand,
  lineFeed,
  barcodeCommand,
  qrCodeData,
  qrCodePrint,
  ESC,
  GS,
  FS,
  LF,
  CR,
};
