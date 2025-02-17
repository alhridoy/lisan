import * as fs from "fs/promises";
import * as path from "path";
import mammoth from "mammoth";

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
  try {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error('File not found or inaccessible');
    }

    // Read the file buffer
    const fileBuffer = await fs.readFile(filePath);
    console.log('Read file buffer, size:', fileBuffer.length);

    try {
      // Dynamically import pdf-parse
      const PDFParser = (await import('pdf-parse')).default;
      console.log('PDF parser imported successfully');

      const pdfData = await PDFParser(fileBuffer);
      console.log('PDF parsing completed, text length:', pdfData.text?.length || 0);

      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('No text content found in PDF file');
      }

      return pdfData.text;
    } catch (error: any) {
      console.error('PDF processing error:', error);
      throw new Error('Failed to process PDF file. Please ensure the file is not corrupted or password protected.');
    }
  } catch (error: any) {
    console.error('Document processing error:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  } finally {
    // Clean up the temporary file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting temporary file:', error);
    }
  }
}