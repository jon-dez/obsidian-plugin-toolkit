// @ts-check
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LICENSE = readFileSync(path.join(__dirname, '../LICENSE.md'), 'utf8');

export default `/*! @license ${LICENSE}\n*/`;
