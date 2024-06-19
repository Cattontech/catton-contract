import * as zlib from 'zlib';
import { promisify } from 'util';
import Logger from './logger';

// Convert zlib functions to promise-based functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function compressString(inputString: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(inputString, 'utf-8');
    const compressedBuffer = await gzip(buffer);
    return compressedBuffer.toString('base64');
  } catch (err) {
    Logger.error('Error compressing string:', err);
    return null;
  }
}

export async function decompressString(compressedString: string): Promise<string | null> {
  try {
    const compressedBuffer = Buffer.from(compressedString, 'base64');
    const decompressedBuffer = await gunzip(compressedBuffer);
    return decompressedBuffer.toString('utf-8');
  } catch (err) {
    Logger.error('Error decompressing string:', err);
    return null;
  }
}