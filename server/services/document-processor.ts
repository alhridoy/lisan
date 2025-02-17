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
      // Create a PDF processor instance
      const createProcessor = (await import('pdf-parse')).default;

      // Process the PDF data directly from the buffer
      const options = {
        // Disable internal file loading
        disableFilesystem: true,
        // Custom rendering for better text extraction
        pagerender: function(pageData: any) {
          const renderOptions = {
            normalizeWhitespace: true,
            disableCombineTextItems: false
          };
          return pageData.getTextContent(renderOptions)
            .then(function(textContent: any) {
              let text = '';
              let lastY = null;
              for (const item of textContent.items) {
                if (lastY !== item.transform[5] && text) {
                  text += '\n';
                }
                text += item.str;
                lastY = item.transform[5];
              }
              return text;
            });
        }
      };

      // Process the buffer directly
      const data = await createProcessor(Buffer.from(fileBuffer), options);

      if (!data || !data.text) {
        throw new Error('No text content could be extracted from the PDF');
      }

      // Clean and normalize the extracted text
      const cleanedText = data.text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
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