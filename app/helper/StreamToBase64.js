import { pipeline } from "stream/promises";
import { Writable } from "stream";

// Helper function to convert a readable stream to a buffer
export const streamToBase64 = (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (chunk) => chunks.push(chunk));
    readableStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      resolve(base64);
    });
    readableStream.on('error', reject);
  });
};
