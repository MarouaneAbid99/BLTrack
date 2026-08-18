const assert = require('node:assert/strict');
const test = require('node:test');
const { OCRNotImplementedError, ocrService } = require('../services/ocr');

test('OCR abstraction is unsupported and never fabricates BL or avoir data', async () => {
  await assert.rejects(() => ocrService.scanBL(), OCRNotImplementedError);
  await assert.rejects(() => ocrService.scanAvoir(), OCRNotImplementedError);
});
