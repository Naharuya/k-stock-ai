import Foundation
import PDFKit
// In-memory extraction: no original document is written to disk.
let bytes = FileHandle.standardInput.readDataToEndOfFile()
guard bytes.count <= 2_000_000, let document = PDFDocument(data: bytes) else { exit(1) }
for index in 0..<document.pageCount {
    if let text = document.page(at: index)?.string { print(text) }
}
