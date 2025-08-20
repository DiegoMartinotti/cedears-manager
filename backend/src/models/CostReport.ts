import SimpleDatabaseConnection from '../database/simple-connection.js';

export interface CostReportRecord {
  id?: number;
  reportType: string;
  reportDate: string;
  dateRange: string;
  reportData: string; // JSON stringified
  generatedAt: string;
  expiresAt?: string;
  fileSize?: number;
  recordCount?: number;
  parameters: string; // JSON stringified filters/options
  status: 'generating' | 'ready' | 'expired' | 'error';
  error?: string;
}

export class CostReport {
  constructor() {
    // Initialize cost_reports table if it doesn't exist
    this.initializeTable();
  }

  private initializeTable() {
    const db = SimpleDatabaseConnection.getInstance();
    if (!db.cost_reports) {
      db.cost_reports = [];
      SimpleDatabaseConnection.save();
    }
  }

  async create(report: Omit<CostReportRecord, 'id' | 'generatedAt'>): Promise<CostReportRecord> {
    const reportToCreate = {
      ...report,
      generatedAt: new Date().toISOString()
    };

    const id = await this.db.create('cost_reports', reportToCreate);
    return { id, ...reportToCreate };
  }

  async findById(id: number): Promise<CostReportRecord | null> {
    return this.db.findById('cost_reports', id);
  }

  async findAll(filters?: {
    reportType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<CostReportRecord[]> {
    let query = 'SELECT * FROM cost_reports WHERE 1=1';
    const params: any[] = [];

    if (filters?.reportType) {
      query += ' AND reportType = ?';
      params.push(filters.reportType);
    }

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.dateFrom) {
      query += ' AND reportDate >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      query += ' AND reportDate <= ?';
      params.push(filters.dateTo);
    }

    query += ' ORDER BY generatedAt DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      
      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    return this.db.query(query, params);
  }

  async update(id: number, updates: Partial<CostReportRecord>): Promise<CostReportRecord | null> {
    const success = await this.db.update('cost_reports', id, updates);
    return success ? this.findById(id) : null;
  }

  async delete(id: number): Promise<boolean> {
    return this.db.delete('cost_reports', id);
  }

  async getReportHistory(limit: number = 50): Promise<CostReportRecord[]> {
    return this.findAll({ limit });
  }

  async getStorageUsage(): Promise<{
    totalReports: number;
    totalSize: number;
    oldestReport: string | null;
    newestReport: string | null;
  }> {
    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as totalReports,
        COALESCE(SUM(fileSize), 0) as totalSize,
        MIN(generatedAt) as oldestReport,
        MAX(generatedAt) as newestReport
      FROM cost_reports
    `);

    return stats[0] || {
      totalReports: 0,
      totalSize: 0,
      oldestReport: null,
      newestReport: null
    };
  }

  async cleanupExpiredReports(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db.query(
      'DELETE FROM cost_reports WHERE expiresAt IS NOT NULL AND expiresAt < ?',
      [now]
    );
    
    return result.changes || 0;
  }

  async getReportsByType(reportType: string, limit: number = 10): Promise<CostReportRecord[]> {
    return this.findAll({ reportType, limit });
  }

  async markAsExpired(id: number): Promise<boolean> {
    return this.db.update('cost_reports', id, { 
      status: 'expired',
      expiresAt: new Date().toISOString()
    });
  }

  async updateStatus(id: number, status: CostReportRecord['status'], error?: string): Promise<boolean> {
    const updates: Partial<CostReportRecord> = { status };
    if (error) {
      updates.error = error;
    }
    
    return this.db.update('cost_reports', id, updates);
  }

  // Helper method to parse JSON data safely
  parseReportData(report: CostReportRecord): any {
    try {
      return JSON.parse(report.reportData);
    } catch (error) {
      console.error('Error parsing report data:', error);
      return null;
    }
  }

  // Helper method to parse parameters safely
  parseParameters(report: CostReportRecord): any {
    try {
      return JSON.parse(report.parameters);
    } catch (error) {
      console.error('Error parsing report parameters:', error);
      return {};
    }
  }

  // Get recent reports for dashboard
  async getRecentReports(days: number = 30): Promise<CostReportRecord[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    return this.findAll({
      dateFrom: dateFrom.toISOString().split('T')[0],
      limit: 20
    });
  }

  // Get report statistics
  async getReportStatistics(): Promise<{
    totalReports: number;
    reportsByType: { [key: string]: number };
    reportsByStatus: { [key: string]: number };
    averageFileSize: number;
    reportsThisMonth: number;
  }> {
    const typeStats = await this.db.query(`
      SELECT reportType, COUNT(*) as count
      FROM cost_reports 
      GROUP BY reportType
    `);

    const statusStats = await this.db.query(`
      SELECT status, COUNT(*) as count
      FROM cost_reports 
      GROUP BY status
    `);

    const generalStats = await this.db.query(`
      SELECT 
        COUNT(*) as totalReports,
        AVG(COALESCE(fileSize, 0)) as averageFileSize
      FROM cost_reports
    `);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await this.db.query(`
      SELECT COUNT(*) as count
      FROM cost_reports 
      WHERE generatedAt >= ?
    `, [thisMonth.toISOString()]);

    const reportsByType: { [key: string]: number } = {};
    typeStats.forEach((stat: any) => {
      reportsByType[stat.reportType] = stat.count;
    });

    const reportsByStatus: { [key: string]: number } = {};
    statusStats.forEach((stat: any) => {
      reportsByStatus[stat.status] = stat.count;
    });

    return {
      totalReports: generalStats[0]?.totalReports || 0,
      reportsByType,
      reportsByStatus,
      averageFileSize: generalStats[0]?.averageFileSize || 0,
      reportsThisMonth: monthlyStats[0]?.count || 0
    };
  }
}