import { LibRRD } from '../vendor/librrd-main/api/librrd.js';
import { initializeRrdPreview } from './preview.js';

const defaultLayoutStylesheet = `
terminal, nonterminal {
  font: monospace normal normal 14px;
}

:root {
  align-items: top;
  justify-content: space-between;
  flex-absorb: 0.3;
}`;

initializeRrdPreview(LibRRD, defaultLayoutStylesheet);
