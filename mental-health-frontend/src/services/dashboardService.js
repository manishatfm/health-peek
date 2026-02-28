import { ApiService } from './base';

export class DashboardService extends ApiService {
  // Dashboard statistics
  async getDashboardStats(timeRange = '30d') {
    const params = new URLSearchParams({ time_range: timeRange });
    return this.request(`/dashboard/stats?${params}`);
  }

  // Mood trends
  async getMoodTrends(timeRange = '30d') {
    const params = new URLSearchParams({ time_range: timeRange });
    return this.request(`/dashboard/mood-trends?${params}`);
  }

  // Personalized suggestions
  async getSuggestions() {
    return this.request('/dashboard/suggestions');
  }

  // Export data
  async exportData(timeRange = '30d', format = 'json') {
    const params = new URLSearchParams({ 
      time_range: timeRange,
      format: format 
    });
    return this.request(`/dashboard/export?${params}`);
  }

  // Export and download as file
  async downloadExport(timeRange = '30d', format = 'json') {
    try {
      const data = await this.exportData(timeRange, format);
      
      // Check if there's data to export
      if (!data || (format === 'csv' && (!data.data || data.data.length === 0)) ||
          (format === 'json' && (!data.analyses || data.analyses.length === 0))) {
        throw new Error('No data available to export');
      }
      
      let content, filename, mimeType;
      
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `mental-health-analysis-${timeRange}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const csvData = data.data || [];
        const headers = csvData.length > 0 ? Object.keys(csvData[0]) : ["timestamp","message","sentiment","confidence","emotions","emoji_analysis"];
        const csvContent = [
          headers.join(','),
          ...csvData.map(row => 
            headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
          )
        ].join('\n');
        
        content = csvContent;
        filename = `mental-health-analysis-${timeRange}.csv`;
        mimeType = 'text/csv';
      }
      
      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Export download error:', error);
      throw error;
    }
  }

  // Download Personal Report PDF
  async downloadPersonalReport(timeRange = '30d') {
    try {
      const params = new URLSearchParams({ time_range: timeRange });
      const response = await fetch(`${this.baseURL}/dashboard/reports/personal?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate personal report');
      }

      // Get filename from header or generate default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'Mental_Health_Personal_Report.pdf';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Personal report download error:', error);
      throw error;
    }
  }

  // Download Clinical Summary PDF
  async downloadClinicalSummary(timeRange = '30d') {
    try {
      const params = new URLSearchParams({ time_range: timeRange });
      const response = await fetch(`${this.baseURL}/dashboard/reports/clinical?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate clinical summary');
      }

      // Get filename from header or generate default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'Mental_Health_Clinical_Summary.pdf';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Clinical summary download error:', error);
      throw error;
    }
  }

  // Download Data Charts PDF
  async downloadDataCharts(timeRange = '30d') {
    try {
      const params = new URLSearchParams({ time_range: timeRange });
      const response = await fetch(`${this.baseURL}/dashboard/reports/charts?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate data charts');
      }

      // Get filename from header or generate default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'Mental_Health_Data_Charts.pdf';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      console.error('Data charts download error:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();