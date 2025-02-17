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

    try {
      // Import pdf-parse and initialize with our buffer
      const pdfParse = await import('pdf-parse');
      console.log('PDF parser imported successfully');

      // Process the PDF
      const data = await pdfParse.default(fileBuffer, {
        // These options help with text extraction reliability
        pagerender: function(pageData: any) {
          // Return text content from page
          return pageData.getTextContent().then(function(textContent: any) {
            let lastY, text = '';
            for (let item of textContent.items) {
              if (lastY != item.transform[5] && text) {
                text += '\n'; // Add newline between different y-positions
              }
              text += item.str;
              lastY = item.transform[5];
            }
            return text;
          });
        }
      });

      if (!data || !data.text) {
        console.error('No text content extracted from PDF');
        throw new Error('No text content could be extracted from the PDF');
      }

      // Clean up and normalize text
      const cleanedText = data.text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/[\r\n]+/g, '\n')  // Normalize line endings
        .trim();

      if (cleanedText.length === 0) {
        throw new Error('Extracted text is empty after cleaning');
      }

      console.log('Successfully extracted text, length:', cleanedText.length);
      return cleanedText;

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