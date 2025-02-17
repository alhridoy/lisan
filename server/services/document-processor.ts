import * as fs from "fs/promises";
import * as path from "path";

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

    // Process PDF
    try {
      // Import pdf-parse dynamically to avoid initialization issues
      const PDFParser = (await import('pdf-parse')).default;

      console.log('PDF parser initialized, processing file...');

      // Pass the buffer directly to PDFParser
      const pdfData = await PDFParser(fileBuffer);

      if (!pdfData || !pdfData.text) {
        console.error('No text content extracted from PDF');
        throw new Error('No text content could be extracted from the PDF');
      }

      const extractedText = pdfData.text.trim();
      console.log('Successfully extracted text, length:', extractedText.length);

      if (extractedText.length === 0) {
        throw new Error('Extracted text is empty');
      }

      return extractedText;

    } catch (error: any) {
      console.error('PDF processing error:', error);
      if (error.message.includes('Invalid PDF structure')) {
        throw new Error('The PDF file appears to be corrupted or invalid');
      } else if (error.message.includes('Password')) {
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