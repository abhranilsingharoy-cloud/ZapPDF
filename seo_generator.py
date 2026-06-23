import os
import re
import glob

TOOLS_DATA = {
    'ai-summarizer.html': {
        'title': 'AI PDF Summarizer - Extract Key Points Fast | ZapPDF',
        'desc': 'Summarize long PDF documents instantly using our client-side AI Summarizer. Extract key points, abstract, and summaries without uploading your data.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>AI Summarizer</strong> utilizes local AI models to read and extract key points from your documents right inside your browser memory.',
        'features': [
            ('🧠', 'Instant AI Summaries', 'Turn 100-page reports into bite-sized summaries in seconds. Our local AI model reads through your document and extracts the most important points, saving you hours of reading time.'),
            ('🔒', '100% Private Processing', 'Unlike other AI tools, we never upload your documents to a cloud server. The AI model runs entirely within your browser, ensuring your sensitive documents remain completely private.'),
            ('📊', 'Customizable Output', 'Choose between bullet points, executive summaries, or detailed abstracts. Tailor the summarization length and style to perfectly fit your needs without losing critical context.')
        ],
        'faqs': [
            ('Is the AI summarization process private?', 'Yes! Unlike online AI converters, ZapPDF runs local AI models directly on your machine using WebAssembly. No document data is ever sent to our servers.'),
            ('How accurate is the summary?', 'Our advanced AI models are trained to extract key concepts, statistics, and conclusions with high accuracy, preserving the core message of your original document.'),
            ('Is there a page limit?', 'Because processing happens on your device, the only limit is your device memory. You can summarize long documents completely free of charge.')
        ]
    },
    'compare-pdf.html': {
        'title': 'Compare PDF Files - Find Differences Fast | ZapPDF',
        'desc': 'Compare two PDF documents side-by-side to highlight differences in text, images, and formatting. 100% private and free.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Comparison</strong> tool utilizes modern WebAssembly to perform complex difference-checking right inside your browser memory.',
        'features': [
            ('🔍', 'Pixel-Perfect Comparison', 'Detect even the smallest changes between two document versions. Our tool highlights differences in text, fonts, and images so nothing slips through the cracks.'),
            ('⚖️', 'Side-by-Side View', 'Review documents intuitively with a synchronized side-by-side comparison interface. When you scroll one document, the other follows perfectly.'),
            ('📑', 'Export Diff Report', 'Once you\'ve found the differences, instantly export a detailed summary report highlighting all additions, deletions, and modifications.')
        ],
        'faqs': [
            ('Are my documents uploaded to a server for comparison?', 'No. Both documents are processed directly in your web browser. We never see or store your sensitive files.'),
            ('Can it detect image changes?', 'Yes! Our visual comparison engine detects modifications to both text and embedded graphics.'),
            ('Does it work with scanned PDFs?', 'For scanned PDFs, we recommend using our OCR tool first to extract text, ensuring the comparison engine can accurately detect text-level changes.')
        ]
    },
    'convert.html': {
        'title': 'Universal Format Converter - PDF, JPG, RAW | ZapPDF',
        'desc': 'Convert PDFs, JPGs, PNGs, RAWs, and PSD files locally in your browser. Fast, private, and high-quality format conversion.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Format Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🔄', 'Universal Format Converter', 'Convert your documents seamlessly without losing quality. Turn heavy PDF documents into high-resolution JPG or PNG image files for easy sharing, or convert RAW camera formats and PSD files instantly into web-ready formats.'),
            ('⚡', 'Lightning Fast Processing', 'By leveraging your device hardware through WebAssembly, conversions happen instantly without waiting in server queues or dealing with upload delays.'),
            ('🎨', 'Preserve Image Quality', 'Our intelligent conversion engine ensures that colors, formatting, and high-DPI resolution are strictly preserved across all format changes.')
        ],
        'faqs': [
            ('Is the conversion process private?', 'Yes! Unlike online converters, ZapPDF uses WebAssembly to convert files directly on your machine. No data is sent to our servers.'),
            ('What formats are supported?', 'You can convert PDFs to high-resolution JPG or PNG. You can also convert images (including RAW and PSD) to PDF.'),
            ('Does it reduce the quality?', 'No, we preserve the original quality of your document or image during conversion.')
        ]
    },
    'crop.html': {
        'title': 'Crop PDF Pages - Trim Margins Visually | ZapPDF',
        'desc': 'Visually crop PDF pages to remove white margins or extract specific sections. Fast, private, and works completely offline in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Cropper</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('✂️', 'Visual Cropping Tool', 'Draw a selection box directly over your PDF pages to define exactly what you want to keep. Trim away annoying white margins or scanner artifacts instantly.'),
            ('📏', 'Apply to All Pages', 'Crop a single page or apply your custom crop box dimensions uniformly across the entire document to standardize page sizes with one click.'),
            ('🚀', 'Instant Client-Side Trimming', 'No need to upload large PDFs. Our cropping engine runs natively in your browser, generating your trimmed PDF in milliseconds.')
        ],
        'faqs': [
            ('Will cropping my PDF reduce the file size?', 'Cropping alters the visible dimensions of the page. To significantly reduce file size, we recommend using our Compress tool after cropping.'),
            ('Can I crop each page differently?', 'Yes, you can adjust the crop box individually for specific pages, or apply a single crop box to the entire document.'),
            ('Are my files uploaded?', 'Never. The cropping process happens entirely in your local browser environment.')
        ]
    },
    'edit.html': {
        'title': 'Edit PDF - Add Text, Images & Shapes | ZapPDF',
        'desc': 'Edit PDF files directly in your browser. Add text, insert images, draw shapes, and annotate documents privately and for free.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Editor</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('✍️', 'Add Text & Annotations', 'Click anywhere on your document to type new text. Change fonts, colors, and sizes instantly to fill out non-interactive forms or add notes.'),
            ('🖼️', 'Insert Images & Shapes', 'Paste logos, signatures, or photos directly onto your PDF. Draw rectangles, circles, or freehand lines to highlight important information.'),
            ('🛡️', 'Secure Local Editing', 'Forget uploading sensitive contracts to third-party servers. Edit your documents locally with zero risk of data interception.')
        ],
        'faqs': [
            ('Can I edit existing text in the PDF?', 'Currently, you can add new text, images, and annotations on top of the document, or use our Redact tool to cover up existing text.'),
            ('Do I need to install any fonts?', 'No, our editor comes with a set of standard web-safe fonts built-in, ensuring your added text looks great on any device.'),
            ('Is it safe for confidential documents?', 'Absolutely. Since everything runs locally via WebAssembly, your confidential data never leaves your computer.')
        ]
    },
    'excel-to-pdf.html': {
        'title': 'Excel to PDF Converter - Preserve Spreadsheets | ZapPDF',
        'desc': 'Convert Excel spreadsheets (XLS, XLSX) to PDF documents. Preserve formatting, tables, and charts completely offline.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Excel to PDF Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📊', 'Preserve Spreadsheet Layout', 'Convert your Excel tables to PDF without breaking the layout. Columns, rows, and cell formatting remain exactly as they appeared in Excel.'),
            ('📑', 'Multi-Sheet Support', 'Choose to convert a single worksheet or combine all sheets from your Excel workbook into a comprehensive multi-page PDF document.'),
            ('🔒', '100% Secure Conversion', 'Financial spreadsheets are sensitive. Our tool converts your data locally in your browser, guaranteeing complete financial privacy.')
        ],
        'faqs': [
            ('Are formulas preserved?', 'Formulas are calculated and their resulting values are permanently printed onto the PDF, ensuring the data cannot be altered.'),
            ('What if my spreadsheet is very wide?', 'Our converter intelligently scales wide tables to fit standard PDF page sizes, or you can choose a landscape orientation.'),
            ('Do I need Microsoft Excel installed?', 'No! Our browser-based engine reads the Excel file directly, so no external software is required.')
        ]
    },
    'extract.html': {
        'title': 'Extract Images from PDF - Download Assets | ZapPDF',
        'desc': 'Extract all embedded images from a PDF file in one click. Download original resolution graphics securely and privately.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Image Extractor</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🖼️', 'Extract Original Assets', 'Pull out every single image embedded in your PDF document in its original, uncompressed resolution. Perfect for recovering lost assets.'),
            ('📦', 'Download as ZIP', 'We automatically package all extracted images into a single, organized ZIP file so you can download hundreds of images with one click.'),
            ('⚡', 'Instant Client-Side Extraction', 'Scan massive PDFs and extract images in seconds. No uploading means no waiting and no bandwidth limits.')
        ],
        'faqs': [
            ('Will the images lose quality?', 'No. We extract the exact binary image data stored inside the PDF, ensuring zero quality loss.'),
            ('Does it extract background images?', 'Yes, the tool detects and extracts all raster images, including photos, backgrounds, and embedded graphics.'),
            ('Is there a limit on how many images I can extract?', 'There are no artificial limits. You can extract as many images as your local device memory can handle.')
        ]
    },
    'html-to-pdf.html': {
        'title': 'HTML to PDF - Convert Webpages to Documents | ZapPDF',
        'desc': 'Convert HTML files, code snippets, and webpages into high-quality PDF documents locally in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>HTML to PDF Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🌐', 'Perfect Webpage Rendering', 'Convert raw HTML files into beautifully formatted PDFs. CSS styles, layouts, and web fonts are preserved for a perfect snapshot.'),
            ('📄', 'Custom Page Sizes', 'Tailor the output by choosing from standard page sizes (A4, Letter) or setting custom dimensions to perfectly fit your web content.'),
            ('🔒', 'Offline HTML Conversion', 'Keep proprietary code and private local HTML files secure. The entire rendering process happens directly within your local browser.')
        ],
        'faqs': [
            ('Does it support CSS styling?', 'Yes, inline styles and embedded CSS within your HTML file are fully supported and rendered accurately in the PDF.'),
            ('Can I convert a live URL?', 'This tool is optimized for converting local HTML files. Simply save the webpage as HTML and drop it into the tool.'),
            ('Are hyperlinks preserved?', 'Yes, `<a>` tags in your HTML will remain clickable hyperlinks in the resulting PDF.')
        ]
    },
    'jpg-to-pdf.html': {
        'title': 'JPG to PDF - Convert Images to Documents | ZapPDF',
        'desc': 'Convert JPG, PNG, and other images into a single PDF document. Adjust margins and orientation privately in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>JPG to PDF Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📸', 'Combine Multiple Images', 'Drag and drop multiple JPG or PNG images and instantly merge them into a single, continuous PDF document.'),
            ('⚙️', 'Adjust Margins & Orientation', 'Customize the final look by adding borders, adjusting page orientation (Portrait/Landscape), and scaling images to fit the page.'),
            ('⚡', 'Zero Upload Wait Times', 'Since everything processes locally, you can convert dozens of high-res photos into a PDF instantly without waiting for slow server uploads.')
        ],
        'faqs': [
            ('Can I reorder the images?', 'Yes! After dropping your images, you can easily drag and drop them to change the order before generating the PDF.'),
            ('Are PNGs and other formats supported?', 'Absolutely. Our tool supports JPG, PNG, SVG, TIFF, and even RAW image formats.'),
            ('Is my photo data secure?', '100% secure. The images are processed in your browser memory and never uploaded to the internet.')
        ]
    },
    'merge.html': {
        'title': 'Merge PDFs - Combine Multiple Documents | ZapPDF',
        'desc': 'Combine multiple PDF files into one master document. Reorder pages and merge PDFs securely in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Merger</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🔗', 'Seamless Document Merging', 'Stitch multiple PDF files together into one cohesive document. Perfect for combining invoices, reports, or chapters into a single file.'),
            ('🔄', 'Drag-and-Drop Reordering', 'Visually arrange the order of your documents before merging. Simply drag the thumbnails into the exact sequence you need.'),
            ('🛡️', 'Secure Offline Merging', 'Don\'t risk uploading sensitive contracts. Our local merging engine processes everything on your device, ensuring total privacy.')
        ],
        'faqs': [
            ('Is there a limit on how many files I can merge?', 'There is no hard limit! You can merge as many files as your device memory can handle, completely free of charge.'),
            ('Does merging reduce quality?', 'Not at all. We securely combine the binary data of the PDFs, ensuring original quality, text, and formatting are perfectly preserved.'),
            ('Can I merge encrypted PDFs?', 'If a PDF is password-protected, you will need to use our Unlock tool first to remove the password before merging.')
        ]
    },
    'number.html': {
        'title': 'Add Page Numbers to PDF | ZapPDF',
        'desc': 'Insert page numbers into your PDF document. Customize position, font, and formatting privately in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Page Numbering</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🔢', 'Custom Page Numbering', 'Easily insert sequential page numbers across your entire document. Perfect for legal briefs, manuscripts, and lengthy reports.'),
            ('🎨', 'Total Formatting Control', 'Choose the exact position (header/footer, left/center/right), font size, and typography style to match your document\'s branding.'),
            ('🚀', 'Instant & Private', 'Add numbering to a 500-page document in milliseconds. All text stamping happens locally in your browser with zero server uploads.')
        ],
        'faqs': [
            ('Can I change the starting page number?', 'Yes! You can specify which page the numbering should start on, which is great for skipping title pages or tables of contents.'),
            ('Can I use formats like "Page 1 of 10"?', 'Absolutely. Our tool supports custom numbering formats, including adding text prefixes and total page counts.'),
            ('Are my files uploaded?', 'No. The numbering process is executed entirely inside your local browser environment.')
        ]
    },
    'ocr.html': {
        'title': 'OCR PDF - Extract Text from Scanned Images | ZapPDF',
        'desc': 'Convert scanned PDFs and images into searchable, selectable text using our local AI-powered OCR engine.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>OCR Tool</strong> utilizes modern WebAssembly to perform complex text extraction right inside your browser memory.',
        'features': [
            ('👁️', 'Tesseract AI Text Extraction', 'Extract raw, copyable text from scanned documents or flat images perfectly. We load the powerful Tesseract.js language models directly into your browser.'),
            ('🔎', 'Make PDFs Searchable', 'Turn flat image-based PDFs into fully searchable documents. Find keywords instantly and copy-paste text that was previously locked in an image.'),
            ('🔒', '100% Private OCR', 'OCR usually requires sending sensitive documents to cloud APIs. We run the optical character recognition entirely locally, ensuring your data stays yours.')
        ],
        'faqs': [
            ('How accurate is the OCR?', 'We use the industry-standard Tesseract engine, which provides highly accurate text extraction for clear, printed documents.'),
            ('Does it support multiple languages?', 'Yes, the engine supports multiple languages. By default, it uses the English language model, but it can recognize standard Latin characters.'),
            ('Why is local OCR better?', 'Local OCR guarantees privacy. Your scanned documents, which often contain sensitive IDs or contracts, are never exposed to external servers.')
        ]
    },
    'organize.html': {
        'title': 'Organize PDF Pages - Delete and Reorder | ZapPDF',
        'desc': 'Delete unwanted pages, reorder existing ones, and organize your PDF document visually and securely in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Organizer</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🗑️', 'Delete Unwanted Pages', 'Quickly remove blank pages, outdated sections, or confidential information from your PDF with a single click on the page thumbnail.'),
            ('🔄', 'Drag-and-Drop Sorting', 'Visually reorganize your document by simply dragging pages into their new desired position. The perfect way to fix scanning mistakes.'),
            ('⚡', 'Instant Local Updates', 'Reorganizing a large document happens instantly. Because we process locally, you don\'t have to wait for huge files to upload and download.')
        ],
        'faqs': [
            ('Can I select multiple pages at once?', 'Yes! You can shift-click to select multiple pages to delete or move them in bulk.'),
            ('Does organizing change the page quality?', 'No, we simply rearrange the internal page references. The quality and contents of the individual pages remain 100% identical.'),
            ('Are my files stored anywhere?', 'Never. All organization happens within your browser\'s memory and the file is saved directly back to your device.')
        ]
    },
    'pdf-forms.html': {
        'title': 'Fill PDF Forms - Interactive Document Filler | ZapPDF',
        'desc': 'Fill out interactive PDF forms, check boxes, and select dropdowns natively in your browser. Fast, free, and completely private.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Forms</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📝', 'Interactive Form Filling', 'Easily fill out interactive PDF forms, including text fields, checkboxes, and radio buttons, directly within your browser interface.'),
            ('💾', 'Flatten and Save', 'Once you\'ve filled out the form, we flatten the data directly onto the document, ensuring your information cannot be altered after saving.'),
            ('🛡️', 'Secure Form Processing', 'Tax forms and applications contain highly sensitive data. Keep it safe by filling out and saving forms entirely offline on your device.')
        ],
        'faqs': [
            ('Can I fill out non-interactive forms?', 'If the PDF doesn\'t have interactive form fields, you can use our "Edit PDF" tool to manually place text boxes over the blank lines.'),
            ('Will the filled data be saved?', 'Yes, when you download the processed file, your entered data is permanently saved into the PDF.'),
            ('Is my entered data secure?', 'Absolutely. Your keystrokes and data never leave your computer, ensuring complete privacy.')
        ]
    },
    'pdf-to-excel.html': {
        'title': 'PDF to Excel - Extract Tables to Spreadsheets | ZapPDF',
        'desc': 'Extract tables and data from PDF documents into editable Excel spreadsheets. Fast, accurate, and completely offline.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF to Excel Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📊', 'Accurate Table Extraction', 'Our advanced parsing engine detects tabular data within your PDF and intelligently exports it into clean, editable Excel spreadsheet cells.'),
            ('🛠️', 'Editable Spreadsheets', 'Turn locked PDF financial reports or invoices back into working Excel (XLSX) files so you can run calculations and edit data immediately.'),
            ('🔒', 'Private Financial Processing', 'Financial data is sensitive. Ensure your company\'s data stays secure by performing the PDF to Excel conversion 100% locally.')
        ],
        'faqs': [
            ('Does it work with scanned tables?', 'For scanned PDFs, the tool relies on OCR to extract text. For the best table formatting, text-based PDFs yield the most accurate results.'),
            ('Are formulas recovered?', 'No, PDFs do not store formulas. The tool extracts the visible calculated values and places them into the spreadsheet cells.'),
            ('Is my data uploaded?', 'Never. The extraction process runs completely inside your local browser.')
        ]
    },
    'pdf-to-jpg.html': {
        'title': 'PDF to JPG - Extract Pages as Images | ZapPDF',
        'desc': 'Convert every page of your PDF into high-quality JPG or PNG images. Extract graphics easily and securely in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF to JPG Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🖼️', 'High-Res Page Extraction', 'Convert every single page of your PDF document into crisp, high-resolution JPG or PNG images perfect for social media or web publishing.'),
            ('⚙️', 'Customizable DPI & Quality', 'Take full control of your output. Adjust the DPI resolution and image quality sliders to balance crystal-clear fidelity with file size.'),
            ('⚡', 'Instant Local Processing', 'Why wait for server queues? Our client-side rendering engine converts massive, multi-page PDFs to images in a matter of seconds.')
        ],
        'faqs': [
            ('Will I get a ZIP file of all images?', 'Yes! If your PDF has multiple pages, we automatically bundle all the converted images into a single ZIP file for easy downloading.'),
            ('Can I choose PNG instead of JPG?', 'Absolutely. Our tool allows you to select between JPG (smaller size) and PNG (lossless quality with transparency) output formats.'),
            ('Does it work entirely offline?', 'Yes, the entire rendering process utilizes your browser\'s local capabilities, guaranteeing 100% privacy.')
        ]
    },
    'pdf-to-pdfa.html': {
        'title': 'PDF to PDF/A - Archive Documents | ZapPDF',
        'desc': 'Convert standard PDFs into PDF/A compliant documents for long-term archiving and preservation. 100% local processing.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF/A Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🏛️', 'ISO Standard Compliance', 'Transform your documents into the PDF/A format, the strict ISO-standardized version of PDF specialized for digital preservation and archiving.'),
            ('🔤', 'Embed All Fonts', 'Our tool automatically ensures all fonts, color profiles, and metadata are deeply embedded into the file so it renders identically decades from now.'),
            ('🔒', 'Secure Archiving', 'Legal and historical documents require privacy. Process and validate your PDF/A compliance completely offline with zero server data transfer.')
        ],
        'faqs': [
            ('Why do I need PDF/A?', 'PDF/A is legally required by many courts, governments, and archives because it guarantees the document will look exactly the same in the future, regardless of software changes.'),
            ('What changes during the conversion?', 'External dependencies are removed, fonts are embedded, and audio/video elements are stripped out to meet strict preservation standards.'),
            ('Is the conversion truly private?', 'Yes. The compliance checking and conversion logic runs natively in your browser.')
        ]
    },
    'pdf-to-ppt.html': {
        'title': 'PDF to PowerPoint - Convert to Presentations | ZapPDF',
        'desc': 'Convert PDF documents into editable PowerPoint (PPTX) presentation slides. Keep your layouts intact locally and privately.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF to PPT Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📽️', 'Generate Editable Slides', 'Turn your static PDF decks back into dynamic, editable PowerPoint (PPTX) presentations. Every page becomes a separate slide.'),
            ('🎨', 'Preserve Visual Layout', 'Our conversion engine maintains the visual integrity of your original document, preserving text positioning, images, and background graphics.'),
            ('⚡', 'Zero Upload Wait Times', 'Convert massive presentation decks instantly. Our local processing engine completely bypasses the need to upload files to a remote server.')
        ],
        'faqs': [
            ('Can I edit the text in the PowerPoint?', 'Yes! We attempt to convert PDF text into editable PowerPoint text boxes whenever the original document is text-based.'),
            ('Does it support scanned presentations?', 'For scanned PDFs, the slides will be generated as full-page images in PowerPoint unless you use our OCR tool first.'),
            ('Is my presentation secure?', '100% secure. Corporate presentations are kept completely private since no data ever leaves your local machine.')
        ]
    },
    'pdf-to-word.html': {
        'title': 'PDF to Word - Convert to Editable DOCX | ZapPDF',
        'desc': 'Convert PDF files into editable Microsoft Word (DOCX) documents. Preserve paragraphs, fonts, and formatting securely offline.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF to Word Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📝', 'Convert to Editable DOCX', 'Unlock static PDFs by converting them into fully editable Microsoft Word documents. Update paragraphs, change fonts, and rewrite content easily.'),
            ('📐', 'Maintain Formatting', 'Our advanced parsing engine intelligently reconstructs paragraphs, lists, and tables so your Word document looks just like the original PDF.'),
            ('🛡️', 'Private Client-Side Processing', 'Contracts and legal documents are highly sensitive. Ensure total confidentiality by converting your files entirely offline in your browser.')
        ],
        'faqs': [
            ('Will the Word document look exactly the same?', 'We strive for the highest accuracy possible. Text, fonts, and basic layouts are preserved, though highly complex visual designs may require minor manual adjustments.'),
            ('Does it work with scanned documents?', 'Scanned documents will be inserted as images in the Word file. We recommend running them through our OCR tool first for best results.'),
            ('Do I need Microsoft Word installed?', 'No, the conversion happens in the browser. However, you will need Word or a compatible editor (like Google Docs) to open the resulting DOCX file.')
        ]
    },
    'ppt-to-pdf.html': {
        'title': 'PowerPoint to PDF - Convert Presentations | ZapPDF',
        'desc': 'Convert PowerPoint (PPT, PPTX) presentations into easily shareable PDF documents. Preserve slide layouts locally in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PPT to PDF Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📽️', 'Lock Presentation Layouts', 'Convert your dynamic PowerPoint slides into a static PDF to ensure your fonts, layouts, and graphics look exactly the same on any device.'),
            ('📄', 'Ready for Distribution', 'PDFs are the universal standard for sharing. Convert your deck before sending it to clients to prevent accidental edits or formatting errors.'),
            ('🔒', '100% Secure Conversion', 'Pitch decks contain confidential data. Our tool converts your presentations locally in your browser, guaranteeing complete privacy.')
        ],
        'faqs': [
            ('Are slide transitions preserved?', 'No, PDFs are static documents. Animations and transitions are removed, capturing the final visual state of each slide.'),
            ('What about speaker notes?', 'Currently, the converter renders the main slide content. Speaker notes are not included in the standard PDF output.'),
            ('Is my pitch deck uploaded?', 'Never. The conversion process runs completely inside your local browser.')
        ]
    },
    'protect.html': {
        'title': 'Protect PDF - Encrypt with Password | ZapPDF',
        'desc': 'Secure your PDF documents with military-grade AES-256 encryption. Add passwords to prevent unauthorized viewing or editing.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Protector</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🔒', 'AES-256 Encryption', 'Lock your PDFs using military-grade AES-256 encryption. It is the strongest encryption standard available, ensuring your data is completely uncrackable.'),
            ('🔑', 'Set Custom Passwords', 'Add a secure user password to prevent anyone from opening the document, or set an owner password to restrict printing, copying, and editing.'),
            ('🛡️', 'True Offline Security', 'It defeats the purpose of encryption if you upload the file to a server. Our tool encrypts your file locally, ensuring the password and data never leave your device.')
        ],
        'faqs': [
            ('Can ZapPDF recover my password if I forget it?', 'No. Because the encryption happens locally and we don\'t store your files or passwords, a lost password cannot be recovered. Keep it safe!'),
            ('What is the difference between an owner and user password?', 'A user password blocks opening the file. An owner password allows opening, but restricts actions like printing, copying text, or editing.'),
            ('Is the encryption legally compliant?', 'Yes, AES-256 is the industry standard for securing confidential financial, medical, and legal documents.')
        ]
    },
    'redact.html': {
        'title': 'Redact PDF - Permanently Erase Sensitive Data | ZapPDF',
        'desc': 'Permanently black out and remove sensitive text or images from your PDF files. Secure, offline document redaction.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Redaction</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('⬛', 'Permanent Data Removal', 'We don\'t just draw a black box over your text. Our redaction engine permanently deletes the underlying text and image data from the file so it cannot be recovered.'),
            ('🖱️', 'Visual Redaction Tool', 'Simply click and drag to draw redaction boxes over names, social security numbers, or sensitive financial data. It\'s fast, visual, and precise.'),
            ('🔒', '100% Client-Side Privacy', 'Redacting sensitive documents online is risky. Our tool processes the redaction entirely in your browser memory, guaranteeing zero data leakage.')
        ],
        'faqs': [
            ('Can someone remove the black box to see the text?', 'No. Unlike basic PDF editors, our redaction tool completely purges the hidden text metadata from the document structure.'),
            ('Can I redact images?', 'Yes, you can draw a redaction box over any part of the page, including embedded images and graphics.'),
            ('Are my redacted files stored anywhere?', 'Never. The entire process happens locally, and the file is saved directly back to your hard drive.')
        ]
    },
    'repair-pdf.html': {
        'title': 'Repair PDF - Fix Corrupted Documents | ZapPDF',
        'desc': 'Analyze and fix corrupted, broken, or unreadable PDF files. Recover your data securely and privately in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Repair</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🛠️', 'Advanced File Recovery', 'Got a PDF that won\'t open? Our engine rebuilds broken cross-reference tables, fixes missing headers, and recovers damaged data streams automatically.'),
            ('🏥', 'Salvage Document Content', 'Even if the file is severely corrupted, our tool attempts to salvage and extract the readable pages, text, and images to a healthy new file.'),
            ('⚡', 'Instant Local Repair', 'Don\'t wait hours for a server to analyze your file. Our repair algorithms run instantly using your local device processor.')
        ],
        'faqs': [
            ('Can every corrupted PDF be fixed?', 'While we fix most common structural errors, files with severely damaged or missing binary data may only be partially recoverable.'),
            ('Will the repaired file look exactly the same?', 'Usually yes. However, if visual elements were in the corrupted section of the file, some formatting might be lost.'),
            ('Is my data safe during repair?', 'Absolutely. The file analysis and repair process happens 100% locally in your browser.')
        ]
    },
    'rotate.html': {
        'title': 'Rotate PDF Pages - Fix Orientation | ZapPDF',
        'desc': 'Rotate individual PDF pages or entire documents. Fix upside-down scans instantly, privately, and offline.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Rotator</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🔄', 'Fix Page Orientation', 'Scanned a document upside down? Easily rotate individual pages or the entire document by 90, 180, or 270 degrees with a single click.'),
            ('🖱️', 'Visual Page Grid', 'View all your pages in a beautiful, responsive thumbnail grid. Quickly spot incorrect orientations and fix them visually before saving.'),
            ('🚀', 'Instant Client-Side Saving', 'Because the rotation happens locally via WebAssembly, your updated PDF is generated in milliseconds—no uploading required.')
        ],
        'faqs': [
            ('Does rotating the PDF reduce its quality?', 'Not at all. We simply update the rotation metadata in the PDF structure, so the visual quality remains 100% identical.'),
            ('Can I rotate just one specific page?', 'Yes, you can hover over any individual page thumbnail and click the rotate icon to adjust only that page.'),
            ('Are my files uploaded?', 'Never. The rotation process is executed entirely inside your local browser environment.')
        ]
    },
    'scan-to-pdf.html': {
        'title': 'Scan to PDF - Digitize Documents | ZapPDF',
        'desc': 'Use your webcam or phone camera to scan physical documents into a clean, multi-page PDF securely in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Scan to PDF</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📷', 'Direct Camera Capture', 'Access your device\'s webcam or smartphone camera directly from the browser to capture photos of physical receipts, notes, and documents.'),
            ('✨', 'Image Enhancement', 'Automatically crop, enhance contrast, and convert your scans to grayscale or black-and-white for a professional, scanner-like appearance.'),
            ('📄', 'Multi-Page Document Creation', 'Take multiple photos in succession and instantly stitch them together into a single, cohesive PDF document.')
        ],
        'faqs': [
            ('Do I need to install an app?', 'No! The scanning tool uses modern web APIs to access your camera directly from your web browser.'),
            ('Are the photos saved to my camera roll?', 'No, the captured images are processed entirely within the browser memory and discarded once the PDF is generated.'),
            ('Is it safe to scan sensitive IDs?', 'Yes. Since no data is transmitted to an external server, scanning sensitive documents like IDs or tax forms is completely secure.')
        ]
    },
    'sign.html': {
        'title': 'eSign PDF - Add Digital Signatures | ZapPDF',
        'desc': 'Draw, type, or upload your signature to digitally sign PDF documents. Fast, secure, and legally binding document signing.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF eSign</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('✍️', 'Draw Your Signature', 'Sign contracts naturally using your mouse, trackpad, or touchscreen. Our smooth HTML5 canvas captures your signature perfectly.'),
            ('✒️', 'Type or Upload', 'Prefer a typed signature? Choose from elegant cursive fonts, or upload an image of your physical signature to stamp onto the document.'),
            ('🛡️', 'Secure Local Signing', 'Contracts are highly confidential. Our eSign tool stamps your signature onto the PDF entirely offline, ensuring zero data interception.')
        ],
        'faqs': [
            ('Are these signatures legally binding?', 'In most jurisdictions, standard electronic signatures created by drawing or typing are legally binding for everyday contracts.'),
            ('Can I add a date or text alongside my signature?', 'Yes, you can use the text tool to add dates, names, and titles anywhere on the document.'),
            ('Is my signature image stored online?', 'No. Your drawn or uploaded signature is processed in local memory and is never uploaded to our servers.')
        ]
    },
    'split.html': {
        'title': 'Split PDF - Extract Pages into New Files | ZapPDF',
        'desc': 'Extract specific pages or split a large PDF into multiple smaller documents. Fast, private, and works offline.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Splitter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('✂️', 'Precision Page Extraction', 'Input a custom page range (like "1-3, 5") to slice out only the pages you need into a brand new, isolated PDF file.'),
            ('📂', 'Split into Multiple Files', 'Break a massive document into individual 1-page PDF files, or split it evenly every X pages. We package the results into a convenient ZIP archive.'),
            ('⚡', 'Instant Local Processing', 'Splitting a 1,000-page document takes milliseconds because our engine processes the file locally without slow server uploads.')
        ],
        'faqs': [
            ('Will splitting the PDF reduce the quality of the pages?', 'No, the extracted pages maintain the exact same quality, text, and formatting as the original document.'),
            ('Can I split a password-protected PDF?', 'You will need to use our Unlock tool first to remove the password before the file can be split.'),
            ('Is there a file size limit?', 'There are no artificial limits. You can process PDFs of any size as long as your device has enough memory.')
        ]
    },
    'translate-pdf.html': {
        'title': 'Translate PDF - AI Document Translation | ZapPDF',
        'desc': 'Translate PDF documents into multiple languages instantly using local AI. Preserve layouts while breaking language barriers.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Translator</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('🌍', 'Multi-Language Translation', 'Translate your documents into dozens of languages. Our AI translation engine processes the text accurately while maintaining context.'),
            ('📐', 'Preserve Document Layout', 'Unlike basic text translators, our tool attempts to replace the text within the PDF itself, preserving your original fonts, images, and formatting.'),
            ('🔒', 'Private AI Processing', 'Translating sensitive business documents online can leak data. We utilize local AI models to ensure your text is never exposed to third parties.')
        ],
        'faqs': [
            ('What languages are supported?', 'Our engine supports all major global languages including Spanish, French, German, Mandarin, Japanese, and more.'),
            ('Does it translate text within images?', 'Currently, the tool translates selectable text. For images, use our OCR tool first to extract the text.'),
            ('Is the translation 100% accurate?', 'While we use advanced AI models, automated translation may not perfectly capture complex nuances. It is excellent for general comprehension.')
        ]
    },
    'watermark.html': {
        'title': 'Watermark PDF - Add Stamps & Text | ZapPDF',
        'desc': 'Stamp custom text or image watermarks onto your PDF documents. Prevent unauthorized sharing privately in your browser.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>PDF Watermark</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('©️', 'Custom Text Watermarks', 'Stamp custom diagonal text (like "CONFIDENTIAL" or "DRAFT") across all pages. Customize the font, size, opacity, and color to fit your needs.'),
            ('🖼️', 'Image Logo Stamping', 'Upload your company logo and automatically place it in the corner or center of every page to brand your documents professionally.'),
            ('🛡️', 'Secure Local Stamping', 'Protect your intellectual property safely. The watermarking process happens entirely on your device, so your unwatermarked original never leaks.')
        ],
        'faqs': [
            ('Can the watermark be easily removed?', 'We flatten the watermark onto the PDF content stream, making it difficult for standard users to remove without specialized redaction software.'),
            ('Can I choose which pages get watermarked?', 'Yes! You can specify a page range to apply the watermark to, or apply it universally to the entire document.'),
            ('Are my files uploaded?', 'Never. The entire watermarking process is executed inside your local browser environment.')
        ]
    },
    'word-to-pdf.html': {
        'title': 'Word to PDF - Convert DOCX to Documents | ZapPDF',
        'desc': 'Convert Microsoft Word (DOCX, DOC) files into universally compatible PDF documents. Preserve formatting locally and securely.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Word to PDF Converter</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('📄', 'Universal PDF Conversion', 'Lock in your Word document\'s formatting by converting it to a static PDF. Ensure your resumes and reports look identical on every device.'),
            ('📐', 'Flawless Layout Retention', 'Our parsing engine guarantees that your fonts, margins, tables, and images remain exactly where you placed them in Microsoft Word.'),
            ('🔒', '100% Offline Processing', 'Resumes and contracts are highly personal. Convert them to PDF completely offline, ensuring your private data is never uploaded.')
        ],
        'faqs': [
            ('Do I need Microsoft Word installed?', 'No! Our browser-based converter reads the DOCX file directly, so no external software or licenses are required.'),
            ('Are hyperlinks preserved in the PDF?', 'Yes, any clickable links in your Word document will remain active and clickable in the resulting PDF.'),
            ('Is my document data secure?', 'Absolutely. The conversion happens entirely within your browser\'s memory and is never sent to a server.')
        ]
    },
    'workflows.html': {
        'title': 'PDF Workflows - Automate Document Tasks | ZapPDF',
        'desc': 'Chain multiple PDF tools together into automated workflows. Merge, compress, and protect documents in one single click.',
        'about': 'ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy. Our <strong>Automated Workflows</strong> tool utilizes modern WebAssembly to perform complex operations right inside your browser memory.',
        'features': [
            ('⚙️', 'Chain Multiple Tools', 'Why do things manually? Build a custom workflow to automatically Merge, Compress, and Watermark your documents in one continuous, seamless sequence.'),
            ('💾', 'Save Custom Presets', 'Create the perfect automation pipeline for your business and save it as a preset. Run your customized workflow again instantly with a single click.'),
            ('⚡', 'Massive Time Savings', 'Process dozens of files through complex multi-step pipelines locally in seconds, saving you hours of tedious manual document management.')
        ],
        'faqs': [
            ('What tools can be chained together?', 'You can chain almost all of our tools, such as merging files, then compressing the result, and finally adding a password.'),
            ('Does it process all steps locally?', 'Yes! The entire pipeline is executed sequentially in your browser\'s memory, ensuring maximum speed and complete privacy.'),
            ('Is there a limit to how many steps I can add?', 'You can add as many steps as you need. The only limitation is your device\'s local processing power and memory.')
        ]
    }
}

def update_html(filepath, tool_key):
    data = TOOLS_DATA.get(tool_key)
    if not data:
        return False
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Replace Title
    content = re.sub(r'<title>.*?</title>', f'<title>{data["title"]}</title>', content, flags=re.IGNORECASE)
    
    # 2. Replace or Insert Meta Description
    desc_tag = f'<meta name="description" content="{data["desc"]}">'
    if re.search(r'<meta name="description".*?>', content, flags=re.IGNORECASE):
        content = re.sub(r'<meta name="description".*?>', desc_tag, content, flags=re.IGNORECASE)
    else:
        # insert after title
        content = re.sub(f'(<title>{re.escape(data["title"])}</title>)', r'\1\n    ' + desc_tag, content)

    # 3. Replace Features (We replace the 5 generic feature rows)
    # The generic feature rows are inside <section id="features" class="sections"> (Wait, no, they are above "How It Works" in <section id="tool-interface"> or similar?
    # Let's target the tool-feature-row divs.
    
    # Actually, the 5 tool-feature-row divs are sequentially placed. Let's find all tool-feature-row divs and replace the entire block.
    # The block starts with the first tool-feature-row and ends with the last tool-feature-row's closing div.
    feature_block_pattern = r'(<div class="tool-feature-row scroll-reveal".*?</div>\s*</div>\s*</div>\s*</div>)' # This regex might be tricky.
    
    # A safer way to replace features: Replace the whole section that contains tool-feature-row.
    # In ai-summarizer, it is after <div id="active-workspace"...> and before <!-- SECTION 5: How It Works -->
    
    # Let's just build the new features HTML
    features_html = ""
    for i, (icon, heading, desc) in enumerate(data['features']):
        flex_dir = "row-reverse" if i % 2 == 0 else "row"
        features_html += f'''
            <div class="tool-feature-row scroll-reveal" style="display: flex; gap: 40px; align-items: center; margin-bottom: 80px; flex-wrap: wrap; flex-direction: {flex_dir};">
                <div class="tool-feature-text" style="flex: 1; min-width: 300px;">
                    <div class="feature-icon-wrapper" style="margin-bottom: 16px; display: inline-flex;">{icon}</div>
                    <h3 style="font-size: 28px; margin-bottom: 16px;">{heading}</h3>
                    <p style="color: var(--color-text-muted); font-size: 18px; line-height: 1.6; margin-bottom: 16px;">
                        {desc}
                    </p>
                </div>
                <div class="tool-feature-visual" style="flex: 1; min-width: 300px; background: var(--color-surface-2); border-radius: var(--radius-lg); padding: 40px; text-align: center; border: 1px solid var(--color-border);">
                    <div style="font-size: 64px;">{icon}</div>
                </div>
            </div>'''

    # Find the block of tool-feature-rows and replace it.
    # We can use regex to match from the first <div class="tool-feature-row" to the end of the last one.
    content = re.sub(r'(<div class="tool-feature-row.*)(?=<!-- SECTION 5: How It Works -->)', features_html + '\n        </div>\n    </section>\n\n    ', content, flags=re.DOTALL)
    # Wait, the closing tags might be mismatched. Let's be precise.
    content = re.sub(r'<div class="tool-feature-row scroll-reveal".*?(?=<!-- SECTION 5: How It Works -->)', features_html + '\n        ', content, flags=re.DOTALL)

    # 4. Replace FAQs
    faq_html = ""
    for q, a in data['faqs']:
        faq_html += f'''
                <div class="faq-item" style="background: var(--color-surface-2); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px;">
                    <h3 style="font-size: 18px; margin-bottom: 12px; color: var(--color-primary);">{q}</h3>
                    <p style="color: var(--color-text-muted); line-height: 1.6;">{a}</p>
                </div>'''
    content = re.sub(r'<div class="faq-container scroll-reveal".*?>.*?</div>\s*</div>\s*</section>', f'<div class="faq-container scroll-reveal" style="max-width: 800px; margin: 0 auto;">{faq_html}\n            </div>\n        </div>\n    </section>', content, flags=re.DOTALL)

    # 5. Replace About text
    content = re.sub(r'(ZapPDF is on a mission to provide professional-grade document tools without compromising your privacy\.\s*Our\s*)<strong>.*?</strong>(.*?)memory\.', data['about'], content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

for f in glob.glob('tools/*.html'):
    basename = os.path.basename(f)
    if update_html(f, basename):
        print(f"Updated {basename}")
    else:
        print(f"Skipped {basename}")
