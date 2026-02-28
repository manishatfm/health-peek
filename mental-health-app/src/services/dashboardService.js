import api from './api';
import { CONFIG } from '../config';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';

const dashboardService = {
  async getDashboardStats(timeRange = '30d') {
    return api.get('/dashboard/stats', { time_range: timeRange });
  },

  async getMoodTrends(timeRange = '30d') {
    return api.get('/dashboard/mood-trends', { time_range: timeRange });
  },

  async getSuggestions() {
    return api.get('/dashboard/suggestions');
  },

  async exportData(timeRange = '30d', format = 'json') {
    return api.get('/dashboard/export', { time_range: timeRange, format });
  },

  async downloadReport(type, timeRange = '30d') {
    const endpoints = {
      personal: '/dashboard/reports/personal',
      clinical: '/dashboard/reports/clinical',
      charts: '/dashboard/reports/charts',
    };

    const endpoint = endpoints[type];
    if (!endpoint) throw new Error('Invalid report type');

    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    const url = `${CONFIG.API_URL}${endpoint}?time_range=${timeRange}`;
    
    const fileName = `${type}_report_${timeRange}.pdf`;
    const dirs = ReactNativeBlobUtil.fs.dirs;

    const res = await ReactNativeBlobUtil.config({
      fileCache: true,
      appendExt: 'pdf',
      path: `${dirs.DocumentDir}/${fileName}`,
    }).fetch('GET', url, {
      Authorization: `Bearer ${token}`,
    });

    const filePath = res.path();

    await Share.open({
      url: `file://${filePath}`,
      type: 'application/pdf',
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
    });

    return filePath;
  },
};

export default dashboardService;
