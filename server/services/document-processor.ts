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
    // Read the file buffer
    const fileBuffer = await fs.readFile(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();

    // Validate file type
    const validTypes = ['.pdf', '.docx'];
    if (!validTypes.includes(fileExtension)) {
      throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
    }

    if (fileExtension === '.pdf') {
      // Dynamically import pdf-parse only when needed
      const pdf = await import('pdf-parse');
      const pdfData = await pdf.default(fileBuffer);
      return pdfData.text;
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    }

    throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
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