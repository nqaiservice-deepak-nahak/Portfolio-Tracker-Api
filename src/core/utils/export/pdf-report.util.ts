export class PdfReportUtil {
  // Production implementation will use HTML templates + PDF generation.
  static getDefaultFileName(reportName: string): string {
    return `${reportName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  }
}
