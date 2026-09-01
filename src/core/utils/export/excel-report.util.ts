export class ExcelReportUtil {
  // Production implementation will use exceljs.
  static getDefaultFileName(reportName: string): string {
    return `${reportName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
}
