import { AvoirScanDraft, BLScanDraft } from '../types';

export interface OCRService {
  scanBL(): Promise<BLScanDraft>;
  scanAvoir(): Promise<AvoirScanDraft>;
}

export class OCRNotImplementedError extends Error {
  constructor() {
    super('OCR is not implemented in BLTrack V2');
    this.name = 'OCRNotImplementedError';
  }
}

class UnsupportedOCRService implements OCRService {
  async scanBL(): Promise<BLScanDraft> {
    throw new OCRNotImplementedError();
  }

  async scanAvoir(): Promise<AvoirScanDraft> {
    throw new OCRNotImplementedError();
  }
}

export const ocrService: OCRService = new UnsupportedOCRService();
