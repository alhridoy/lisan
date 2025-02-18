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
      // Import pdf-parse without accessing its filesystem
      const pdfParse = (await import('pdf-parse')).default;

      // Create a buffer copy to ensure we're not using the same reference
      const pdfBuffer = Buffer.from(fileBuffer);

      // Process PDF with custom options to avoid filesystem access
      const options = {
        // Prevent pdf-parse from loading any external files
        disableGlobalTest: true,
        disableLocalTest: true,
        // Custom page rendering to extract text properly
        pagerender: function(pageData: any) {
          return pageData.getTextContent().then(function(textContent: any) {
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY != item.transform[5] && text) {
                text += '\n';
              }
              text += item.str;
              lastY = item.transform[5];
            }
            return text;
          });
        }
      };

      console.log('Processing PDF with buffer size:', pdfBuffer.length);
      const data = await pdfParse(pdfBuffer, options);

      if (!data || !data.text) {
        throw new Error('No text content could be extracted from the PDF');
      }

      // Clean up the text
      const cleanedText = data.text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim();

      console.log('Successfully extracted text, length:', cleanedText.length);
      return cleanedText;

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
  }
}