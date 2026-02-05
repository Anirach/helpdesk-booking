import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  UnderlineType,
  TableOfContents,
  PageBreak,
  convertInchesToTwip,
  Header,
  Footer,
} from 'docx';
import MarkdownIt from 'markdown-it';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MANUAL_DIR = path.join(process.cwd(), 'Manual');
const OUTPUT_FILE = path.join(process.cwd(), 'Help_Desk_Manual_v1.0.docx');

const THAI_FONT = 'TH Sarabun New';
const CODE_FONT = 'Consolas';
const FALLBACK_FONT = 'Arial Unicode MS';

// ============================================================================
// MARKDOWN PARSER
// ============================================================================

const md = new MarkdownIt();

// ============================================================================
// FILE DISCOVERY
// ============================================================================

interface ManualFile {
  path: string;
  name: string;
  order: number;
}

async function discoverMarkdownFiles(dir: string): Promise<ManualFile[]> {
  const files: ManualFile[] = [];

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Extract numeric prefix for ordering
        const match = entry.name.match(/^(\d+)-/);
        const order = match ? parseInt(match[1], 10) : 999;

        files.push({
          path: fullPath,
          name: entry.name,
          order,
        });
      }
    }
  }

  await walk(dir);

  // Sort by order number
  return files.sort((a, b) => a.order - b.order);
}

// ============================================================================
// COVER PAGE
// ============================================================================

function createCoverPage(): Paragraph[] {
  return [
    new Paragraph({
      text: 'คู่มือระบบจองนัดหมาย Help Desk',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 },
      font: THAI_FONT,
    }),
    new Paragraph({
      text: 'Help Desk Booking System User Manual',
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 },
      font: THAI_FONT,
    }),
    new Paragraph({
      text: 'Version 1.0',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      font: THAI_FONT,
    }),
    new Paragraph({
      text: 'February 2026',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      font: THAI_FONT,
    }),
    new Paragraph({
      text: 'Prachinburi Computer Center',
      alignment: AlignmentType.CENTER,
      spacing: { after: 4000 },
      font: THAI_FONT,
    }),
  ];
}

// ============================================================================
// MARKDOWN TO DOCX CONVERSION
// ============================================================================

interface ConversionContext {
  inCodeBlock: boolean;
  codeBlockContent: string[];
  codeBlockLanguage: string;
  inTable: boolean;
  tableRows: string[][];
  listLevel: number;
}

function parseMarkdownContent(content: string): any[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  const context: ConversionContext = {
    inCodeBlock: false,
    codeBlockContent: [],
    codeBlockLanguage: '',
    inTable: false,
    tableRows: [],
    listLevel: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!context.inCodeBlock) {
        // Start code block
        context.inCodeBlock = true;
        context.codeBlockLanguage = line.substring(3).trim();
        context.codeBlockContent = [];
      } else {
        // End code block
        context.inCodeBlock = false;
        paragraphs.push(...createCodeBlock(context.codeBlockContent));
        context.codeBlockContent = [];
      }
      continue;
    }

    if (context.inCodeBlock) {
      context.codeBlockContent.push(line);
      continue;
    }

    // Handle tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!context.inTable) {
        context.inTable = true;
        context.tableRows = [];
      }

      // Skip separator rows (e.g., |---|---|)
      if (line.match(/^\|[\s:-]+\|[\s:-]*$/)) {
        continue;
      }

      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      context.tableRows.push(cells);
      continue;
    } else if (context.inTable) {
      // End of table
      context.inTable = false;
      if (context.tableRows.length > 0) {
        paragraphs.push(...createTable(context.tableRows));
        context.tableRows = [];
      }
    }

    // Handle headings
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+\s*/, '').trim();
      paragraphs.push(createHeading(text, level));
      continue;
    }

    // Handle horizontal rules
    if (line.match(/^---+$/)) {
      paragraphs.push(
        new Paragraph({
          text: '',
          border: {
            bottom: {
              color: 'CCCCCC',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    // Handle unordered lists
    if (line.match(/^\s*[-*+]\s/)) {
      const indent = (line.match(/^\s*/)?.[0].length || 0) / 2;
      const text = line.replace(/^\s*[-*+]\s+/, '').trim();
      paragraphs.push(createBulletPoint(text, indent));
      continue;
    }

    // Handle ordered lists
    if (line.match(/^\s*\d+\.\s/)) {
      const indent = (line.match(/^\s*/)?.[0].length || 0) / 2;
      const text = line.replace(/^\s*\d+\.\s+/, '').trim();
      paragraphs.push(createNumberedPoint(text, indent));
      continue;
    }

    // Handle keyboard shortcuts (e.g., <kbd>Ctrl</kbd>)
    if (line.includes('<kbd>')) {
      paragraphs.push(createKeyboardShortcutParagraph(line));
      continue;
    }

    // Handle regular paragraphs
    if (line.trim().length > 0) {
      paragraphs.push(createParagraph(line.trim()));
    } else {
      // Empty line - small spacing
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { before: 120, after: 120 },
        })
      );
    }
  }

  // Handle any remaining table
  if (context.inTable && context.tableRows.length > 0) {
    paragraphs.push(...createTable(context.tableRows));
  }

  // Handle any remaining code block
  if (context.inCodeBlock && context.codeBlockContent.length > 0) {
    paragraphs.push(...createCodeBlock(context.codeBlockContent));
  }

  return paragraphs;
}

// ============================================================================
// ELEMENT CREATORS
// ============================================================================

function createHeading(text: string, level: number): Paragraph {
  const headingLevelMap: { [key: number]: HeadingLevel } = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  const sizeMap: { [key: number]: number } = {
    1: 32, // 16pt
    2: 28, // 14pt
    3: 24, // 12pt
    4: 22, // 11pt
    5: 20, // 10pt
    6: 20, // 10pt
  };

  const colorMap: { [key: number]: string } = {
    1: '1F4788', // Navy
    2: '2E5090', // Blue
    3: '000000', // Black
    4: '000000',
    5: '000000',
    6: '000000',
  };

  return new Paragraph({
    text: text,
    heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
    spacing: {
      before: level === 1 ? 480 : 360,
      after: level === 1 ? 240 : 180,
    },
    run: {
      font: THAI_FONT,
      size: sizeMap[level] || 24,
      bold: true,
      color: colorMap[level] || '000000',
    },
  });
}

function createParagraph(text: string): Paragraph {
  // Parse inline formatting
  const runs = parseInlineFormatting(text);

  return new Paragraph({
    children: runs,
    spacing: { before: 100, after: 100, line: 360 },
  });
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let currentPos = 0;

  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentPos) {
      const plainText = text.substring(currentPos, match.index);
      runs.push(
        new TextRun({
          text: plainText,
          font: THAI_FONT,
          size: 24,
        })
      );
    }

    // Add formatted text
    if (match[1]) {
      // Bold
      runs.push(
        new TextRun({
          text: match[2],
          font: THAI_FONT,
          size: 24,
          bold: true,
        })
      );
    } else if (match[3]) {
      // Italic
      runs.push(
        new TextRun({
          text: match[4],
          font: THAI_FONT,
          size: 24,
          italics: true,
        })
      );
    } else if (match[5]) {
      // Code
      runs.push(
        new TextRun({
          text: match[6],
          font: CODE_FONT,
          size: 20,
          shading: {
            type: ShadingType.SOLID,
            color: 'F5F5F5',
          },
        })
      );
    }

    currentPos = match.index + match[0].length;
  }

  // Add remaining text
  if (currentPos < text.length) {
    runs.push(
      new TextRun({
        text: text.substring(currentPos),
        font: THAI_FONT,
        size: 24,
      })
    );
  }

  // If no formatting found, return simple text run
  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: text,
        font: THAI_FONT,
        size: 24,
      })
    );
  }

  return runs;
}

function createCodeBlock(lines: string[]): Paragraph[] {
  return lines.map(
    (line) =>
      new Paragraph({
        text: line || ' ',
        font: CODE_FONT,
        size: 20,
        shading: {
          type: ShadingType.SOLID,
          color: 'F5F5F5',
        },
        spacing: { before: 50, after: 50 },
        indent: { left: convertInchesToTwip(0.5) },
      })
  );
}

function createTable(rows: string[][]): any[] {
  if (rows.length === 0) return [];

  const tableRows = rows.map((rowCells, rowIndex) => {
    const isHeader = rowIndex === 0;

    return new TableRow({
      children: rowCells.map(
        (cellText) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cellText,
                    font: THAI_FONT,
                    size: 22,
                    bold: isHeader,
                    color: isHeader ? 'FFFFFF' : '000000',
                  }),
                ],
              }),
            ],
            shading: isHeader
              ? { type: ShadingType.SOLID, color: '2E5090' }
              : undefined,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
          })
      ),
    });
  });

  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });

  // Return table directly, with spacing paragraphs
  return [
    new Paragraph({ text: '', spacing: { before: 200 } }),
    table,
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];
}

function createBulletPoint(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    children: parseInlineFormatting(text),
    bullet: { level },
    spacing: { before: 80, after: 80 },
  });
}

function createNumberedPoint(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    children: parseInlineFormatting(text),
    numbering: { reference: 'default-numbering', level },
    spacing: { before: 80, after: 80 },
  });
}

function createKeyboardShortcutParagraph(text: string): Paragraph {
  const runs: TextRun[] = [];

  // Match <kbd>...</kbd> tags
  const regex = /<kbd>([^<]+)<\/kbd>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.substring(lastIndex, match.index),
          font: THAI_FONT,
          size: 24,
        })
      );
    }

    // Add keyboard key
    runs.push(
      new TextRun({
        text: match[1],
        font: CODE_FONT,
        size: 20,
        bold: true,
        border: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: '666666',
        },
        shading: {
          type: ShadingType.SOLID,
          color: 'EEEEEE',
        },
      })
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.substring(lastIndex),
        font: THAI_FONT,
        size: 24,
      })
    );
  }

  return new Paragraph({
    children: runs,
    spacing: { before: 100, after: 100 },
  });
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Starting manual generation...\n');

  // Step 1: Discover markdown files
  console.log(`📂 Discovering markdown files in ${MANUAL_DIR}...`);
  const files = await discoverMarkdownFiles(MANUAL_DIR);
  console.log(`✓ Found ${files.length} files\n`);

  // Step 2: Create document sections
  const children: any[] = [];

  // Add cover page
  console.log('📄 Creating cover page...');
  children.push(...createCoverPage());
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Add table of contents
  console.log('📑 Adding table of contents...');
  children.push(
    new Paragraph({
      text: 'Table of Contents',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 240 },
    })
  );
  children.push(
    new Paragraph({
      text: 'Right-click here in Word and select "Update Field" to generate the table of contents.',
      italics: true,
      spacing: { after: 400 },
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Process each markdown file
  console.log('📝 Processing markdown files...\n');
  let processedCount = 0;

  for (const file of files) {
    processedCount++;
    const percentage = Math.round((processedCount / files.length) * 100);
    console.log(`  [${percentage}%] ${file.name}`);

    const content = await fs.readFile(file.path, 'utf-8');
    const paragraphs = parseMarkdownContent(content);
    children.push(...paragraphs);

    // Add page break between major sections
    const fileNumber = file.order;
    if (
      fileNumber === 2 ||
      fileNumber === 14 ||
      fileNumber === 30 ||
      fileNumber === 50 ||
      fileNumber === 64
    ) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  console.log('\n📦 Creating DOCX document...');

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: 'Help Desk Booking System User Manual v1.0',
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                border: {
                  bottom: {
                    color: 'CCCCCC',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
                children: [
                  new TextRun({
                    text: 'Help Desk Booking System User Manual v1.0',
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
                border: {
                  top: {
                    color: 'CCCCCC',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
                children: [
                  new TextRun({
                    text: 'Page ',
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                  new TextRun({
                    children: ['PAGE_NUMBER'],
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                  new TextRun({
                    text: ' of ',
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                  new TextRun({
                    children: ['TOTAL_PAGES'],
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                  new TextRun({
                    text: ' | February 2026',
                    font: THAI_FONT,
                    size: 20,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
            {
              level: 1,
              format: 'lowerLetter',
              text: '%2.',
              alignment: AlignmentType.LEFT,
            },
            {
              level: 2,
              format: 'lowerRoman',
              text: '%3.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  });

  // Generate DOCX file
  console.log('💾 Writing file to disk...');
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(OUTPUT_FILE, buffer);

  console.log(`\n✅ Manual generated successfully!`);
  console.log(`📍 Location: ${OUTPUT_FILE}`);

  // Get file size
  const stats = await fs.stat(OUTPUT_FILE);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📊 File size: ${sizeMB} MB`);
  console.log('\n🎉 Done! Open the file in Microsoft Word or LibreOffice.\n');
}

// ============================================================================
// EXECUTE
// ============================================================================

main().catch((error) => {
  console.error('❌ Error generating manual:', error);
  process.exit(1);
});
