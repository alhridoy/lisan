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
    const fileExtension = path.extname(filePath).toLowerCase();

    // Process based on file type
    if (fileExtension === '.pdf') {
      try {
        console.log('Processing PDF file:', path.basename(filePath));
        console.log('File size:', fileBuffer.length, 'bytes');

        // Dynamically import pdf-parse
        const PDFParser = (await import('pdf-parse')).default;
        const pdfData = await PDFParser(fileBuffer);

        if (!pdfData.text || pdfData.text.trim().length === 0) {
          throw new Error('No text content found in PDF file');
        }

        return pdfData.text;
      } catch (error: any) {
        console.error('PDF processing error:', error);
        throw new Error('Failed to process PDF file. Please ensure the file is not corrupted or password protected.');
      }
    } else if (fileExtension === '.docx') {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        if (!result.value || result.value.trim().length === 0) {
          throw new Error('No text content found in DOCX file');
        }
        return result.value;
      } catch (error: any) {
        console.error('DOCX processing error:', error);
        throw new Error('Failed to process DOCX file. Please ensure the file is not corrupted.');
      }
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
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