import * as fs from "fs/promises";
import * as path from "path";
import { PDFDocument } from "pdf-lib";

// Add type declaration for multer
declare module "express" {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        destination: string;
        filename: string;
        path: string;
        size: number;
      }
    }
  }
}

export async function extractTextFromDocument(filePath: string): Promise<string> {
  let fileBuffer: Buffer | null = null;

  try {
    console.log('Starting document processing for:', path.basename(filePath));

    // Verify file exists and is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      console.error('File access error:', error);
      throw new Error('File not found or not readable');
    }

    // Read file into buffer
    try {
      fileBuffer = await fs.readFile(filePath);
      console.log('Successfully read file, size:', fileBuffer.length, 'bytes');
    } catch (error) {
      console.error('File read error:', error);
      throw new Error('Failed to read file');
    }

    // Process PDF using pdf-lib
    try {
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(fileBuffer);
      console.log('PDF document loaded successfully');

      // Get the number of pages
      const numberOfPages = pdfDoc.getPageCount();
      console.log('Number of pages:', numberOfPages);

      if (numberOfPages === 0) {
        throw new Error('The PDF document contains no pages');
      }

      // Extract text content from each page
      let extractedText = '';
      for (let i = 0; i < numberOfPages; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        // Get text content
        const textContent = await page.getText();
        if (textContent) {
          extractedText += textContent + '\n\n';
        }
      }

      // Clean up and normalize text
      const normalizedText = extractedText
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalizedText) {
        throw new Error('No text content could be extracted from the PDF');
      }

      console.log('Successfully extracted text, length:', normalizedText.length);
      return normalizedText;

    } catch (error: any) {
      console.error('PDF processing error:', error);
      if (error.message.includes('Invalid PDF')) {
        throw new Error('The PDF file appears to be corrupted or invalid');
      } else if (error.message.includes('password')) {
        throw new Error('The PDF file is password protected');
      } else {
        throw new Error(`Failed to process PDF: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  } finally {
    // Clean up resources
    fileBuffer = null;

    // Clean up the temporary file
    try {
      await fs.unlink(filePath);
      console.log('Temporary file cleaned up:', path.basename(filePath));
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  }
}