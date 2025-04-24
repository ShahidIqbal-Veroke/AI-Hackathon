import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ThemeService } from '../services/theme.service';
import { NotificationService } from '../services/notification.service';
import { SettingsService, ThresholdSettings } from '../services/settings.service';
import { SettingsDialogComponent } from '../components/settings-dialog/settings-dialog.component';
import { Observable, Subscription, interval } from 'rxjs';
import { Chart } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { CommonModule, DatePipe } from '@angular/common';
import { CategoryScale, LinearScale, PointElement, LineElement, Title, Legend } from 'chart.js';
import { ChartConfiguration } from 'chart.js';
import { MetricsService, MetricsData } from '../services/metrics.service';
import { HttpClientModule } from '@angular/common/http';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend
);

interface HealthMetric {
  value: number;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
}

interface HistoricalRecord {
  timestamp: Date;
  heartRate: number;
  systolic: number;
  diastolic: number;
  heartRateStatus: 'normal' | 'warning' | 'critical';
  bloodPressureStatus: 'normal' | 'warning' | 'critical';
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    label: string;
    fill: boolean;
    tension: number;
    borderColor: string;
    backgroundColor: string;
  }[];
}

interface ChartOptions {
  scales: {
    y: {
      beginAtZero: boolean;
      grid: { color: string };
      ticks: { color: string };
      title: { display: boolean; text: string; color: string };
    };
    x: {
      grid: { color: string };
      ticks: { color: string };
      title: { display: boolean; text: string; color: string };
    };
  };
  plugins: {
    legend: {
      display: boolean;
      position: 'top';
      labels: { color: string };
    };
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgChartsModule, SettingsDialogComponent, HttpClientModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  // Public properties
  public isDarkTheme$!: Observable<boolean>;
  public historicalData: HistoricalRecord[] = [];
  public isPaused = false;
  public isDataStale = false;
  public lastUpdateTime = new Date();

  // Current readings
  public currentHeartRate: HealthMetric = { value: 0, timestamp: new Date(), status: 'normal' };
  public currentBloodPressure: { systolic: HealthMetric; diastolic: HealthMetric } = {
    systolic: { value: 0, timestamp: new Date(), status: 'normal' },
    diastolic: { value: 0, timestamp: new Date(), status: 'normal' }
  };

  // Chart data
  public heartRateChartData: ChartData = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Heart Rate (BPM)',
        fill: true,
        tension: 0.5,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)'
      }
    ]
  };
  public bloodPressureChartData: ChartData = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Systolic (mmHg)',
        fill: true,
        tension: 0.5,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)'
      },
      {
        data: [],
        label: 'Diastolic (mmHg)',
        fill: true,
        tension: 0.5,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)'
      }
    ]
  };
  public chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { 
          color: 'var(--text-primary)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'var(--bg-secondary)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { 
          color: 'var(--chart-grid)',
          display: true
        },
        ticks: { 
          color: 'var(--text-primary)',
          font: {
            size: 12
          }
        },
        title: {
          display: true,
          text: 'Value',
          color: 'var(--text-primary)',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      x: {
        grid: { 
          color: 'var(--chart-grid)',
          display: true
        },
        ticks: { 
          color: 'var(--text-primary)',
          font: {
            size: 12
          }
        },
        title: {
          display: true,
          text: 'Time',
          color: 'var(--text-primary)',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
  public chartLegend = true;

  // Private properties
  private updateInterval: any;
  private staleCheckInterval: any;
  private readonly STALE_DATA_THRESHOLD = 30000; // 30 seconds
  public HEART_RATE_THRESHOLDS = {
    normal: { min: 60, max: 100 },
    warning: { min: 60, max: 100 },
    critical: { min: 50, max: 120 }
  };
  public BLOOD_PRESSURE_THRESHOLDS = {
    systolic: {
      normal: { min: 90, max: 120 },
      warning: { min: 120, max: 140 },
      critical: { min: 90, max: 180 }
    },
    diastolic: {
      normal: { min: 60, max: 80 },
      warning: { min: 80, max: 90 },
      critical: { min: 60, max: 120 }
    }
  };

  private metricsSubscription: Subscription | undefined;

  @ViewChild(SettingsDialogComponent) private settingsDialog!: SettingsDialogComponent;

  constructor(
    public themeService: ThemeService,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private metricsService: MetricsService
  ) {
    this.isDarkTheme$ = this.themeService.isDarkTheme$;
    this.initializeChartOptions();
    this.initializeChartData();
  }

  private initializeChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { 
            color: 'var(--text-primary)',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'var(--bg-secondary)',
          titleColor: 'var(--text-primary)',
          bodyColor: 'var(--text-primary)',
          borderColor: 'var(--border-color)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { 
            color: 'var(--chart-grid)'
          },
          ticks: { 
            color: 'var(--text-primary)',
            font: {
              size: 12
            }
          },
          title: {
            display: true,
            text: 'Value',
            color: 'var(--text-primary)',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        x: {
          grid: { 
            color: 'var(--chart-grid)'
          },
          ticks: { 
            color: 'var(--text-primary)',
            font: {
              size: 12
            }
          },
          title: {
            display: true,
            text: 'Time',
            color: 'var(--text-primary)',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  }

  private initializeChartData(): void {
    this.heartRateChartData = {
      labels: [],
      datasets: [{
        data: [],
        label: 'Heart Rate (BPM)',
        fill: true,
        tension: 0.5,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)'
      }]
    };

    this.bloodPressureChartData = {
      labels: [],
      datasets: [
        {
          data: [],
          label: 'Systolic (mmHg)',
          fill: true,
          tension: 0.5,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)'
        },
        {
          data: [],
          label: 'Diastolic (mmHg)',
          fill: true,
          tension: 0.5,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)'
        }
      ]
    };
  }

  ngOnInit(): void {
    this.startStaleDataCheck();
    this.initializeData();
    this.startRealTimeUpdates();
    
    // Subscribe to theme changes
    this.themeService.isDarkTheme$.subscribe(isDark => {
      this.updateChartTheme(isDark);
    });

    // Subscribe to settings changes
    this.settingsService.thresholdSettings$.subscribe(settings => {
      this.updateThresholds(settings);
    });
  }

  private startStaleDataCheck(): void {
    this.staleCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime.getTime();
      this.isDataStale = timeSinceLastUpdate > this.STALE_DATA_THRESHOLD;
    }, 1000);
  }

  private startRealTimeUpdates(): void {
    // Update every 3 seconds
    this.metricsSubscription = interval(3000).subscribe(() => {
      if (!this.isPaused) {
        this.fetchMetrics();
      }
    });
  }

  private initializeData(): void {
    this.lastUpdateTime = new Date();
    
    // Generate last 5 minutes of data
    const numberOfPoints = 5; // One point per minute
    const now = new Date();
    
    for (let i = numberOfPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // Subtract i minutes
      const heartRate = this.generateHeartRate();
      const { systolic, diastolic } = this.generateBloodPressure();
      const timeLabel = timestamp.toLocaleTimeString();

      // Update charts
      this.updateChartData(timeLabel, heartRate, { systolic, diastolic });

      // Add to historical data
      this.historicalData.push({
        timestamp: timestamp,
        heartRate: heartRate,
        systolic: systolic,
        diastolic: diastolic,
        heartRateStatus: this.getHeartRateStatus(heartRate),
        bloodPressureStatus: this.getBloodPressureStatus(systolic, 'systolic')
      });
    }

    // Update current readings with the latest values
    const latestData = this.historicalData[this.historicalData.length - 1];
    this.currentHeartRate = {
      value: latestData.heartRate,
      timestamp: latestData.timestamp,
      status: latestData.heartRateStatus
    };

    this.currentBloodPressure = {
      systolic: {
        value: latestData.systolic,
        timestamp: latestData.timestamp,
        status: this.getBloodPressureStatus(latestData.systolic, 'systolic')
      },
      diastolic: {
        value: latestData.diastolic,
        timestamp: latestData.timestamp,
        status: this.getBloodPressureStatus(latestData.diastolic, 'diastolic')
      }
    };
  }

  private updateMetricsWithData(data: MetricsData): void {
    const timestamp = new Date();
    const timeLabel = timestamp.toLocaleTimeString();

    // Update current readings
    this.currentHeartRate = {
      value: data.heartRate,
      timestamp: timestamp,
      status: this.getHeartRateStatus(data.heartRate)
    };

    this.currentBloodPressure = {
      systolic: {
        value: data.systolic,
        timestamp: timestamp,
        status: this.getBloodPressureStatus(data.systolic, 'systolic')
      },
      diastolic: {
        value: data.diastolic,
        timestamp: timestamp,
        status: this.getBloodPressureStatus(data.diastolic, 'diastolic')
      }
    };

    // Update charts
    this.updateChartData(timeLabel, data.heartRate, {
      systolic: data.systolic,
      diastolic: data.diastolic
    });

    // Add to historical data
    this.historicalData.push({
      timestamp: timestamp,
      heartRate: data.heartRate,
      systolic: data.systolic,
      diastolic: data.diastolic,
      heartRateStatus: this.getHeartRateStatus(data.heartRate),
      bloodPressureStatus: this.getBloodPressureStatus(data.systolic, 'systolic')
    });

    // Keep only last 15 minutes of data
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    this.historicalData = this.historicalData.filter(record => record.timestamp > fifteenMinutesAgo);

    // Update last update time
    this.lastUpdateTime = timestamp;
    this.isDataStale = false;
  }

  private fetchMetrics(): void {
    this.metricsService.getMetrics().subscribe({
      next: (data: MetricsData[]) => {
        if (data && data.length > 0) {
          const latestData = data[data.length - 1];
          this.updateMetricsWithData(latestData);
        }
      },
      error: (error) => {
        console.error('Error fetching metrics:', error);
        this.notificationService.showAlert('Error', 'Failed to fetch health metrics data', 'critical');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
    }
    if (this.metricsSubscription) {
      this.metricsSubscription.unsubscribe();
    }
  }

  private generateInitialData() {
    const timeLabel = this.lastUpdateTime.toLocaleTimeString();
    const heartRate = this.generateHeartRate();
    const { systolic, diastolic } = this.generateBloodPressure();
    return { timeLabel, heartRate, systolic, diastolic };
  }

  private getHeartRateStatus(value: number): 'normal' | 'warning' | 'critical' {
    const prevStatus = this.currentHeartRate.status;
    let status: 'normal' | 'warning' | 'critical';

    if (value < this.HEART_RATE_THRESHOLDS.critical.min || value > this.HEART_RATE_THRESHOLDS.critical.max) {
      status = 'critical';
    } else if (value < this.HEART_RATE_THRESHOLDS.warning.min || value > this.HEART_RATE_THRESHOLDS.warning.max) {
      status = 'warning';
    } else {
      status = 'normal';
    }

    // Show alert if status worsens
    if (prevStatus && status !== 'normal' && (prevStatus === 'normal' || (prevStatus === 'warning' && status === 'critical'))) {
      const message = `Heart rate is ${value} bpm (${this.HEART_RATE_THRESHOLDS[status].min}-${this.HEART_RATE_THRESHOLDS[status].max} bpm)`;
      this.notificationService.showAlert('Heart Rate Alert', message, status);
    }

    return status;
  }

  private generateHeartRate(): number {
    // Generate more realistic heart rate values between 60 and 100
    const baseHeartRate = 80; // Average heart rate
    const variation = 20; // +/- variation
    return Math.floor(baseHeartRate + (Math.random() * variation * 2) - variation);
  }

  private generateBloodPressure(): { systolic: number; diastolic: number } {
    // Generate more realistic blood pressure values
    const baseSystolic = 120; // Average systolic
    const baseDiastolic = 80; // Average diastolic
    const systolicVariation = 20;
    const diastolicVariation = 10;

    return {
      systolic: Math.floor(baseSystolic + (Math.random() * systolicVariation * 2) - systolicVariation),
      diastolic: Math.floor(baseDiastolic + (Math.random() * diastolicVariation * 2) - diastolicVariation)
    };
  }

  private updateChartData(timeLabel: string, heartRate: number, bloodPressure: { systolic: number; diastolic: number }): void {
    // Update heart rate chart
    this.heartRateChartData.labels.push(timeLabel);
    this.heartRateChartData.datasets[0].data.push(heartRate);

    // Update blood pressure chart
    this.bloodPressureChartData.labels.push(timeLabel);
    this.bloodPressureChartData.datasets[0].data.push(bloodPressure.systolic);
    this.bloodPressureChartData.datasets[1].data.push(bloodPressure.diastolic);

    // Keep only last 20 data points
    const maxPoints = 20;
    if (this.heartRateChartData.labels.length > maxPoints) {
      this.heartRateChartData.labels.shift();
      this.heartRateChartData.datasets[0].data.shift();
      this.bloodPressureChartData.labels.shift();
      this.bloodPressureChartData.datasets[0].data.shift();
      this.bloodPressureChartData.datasets[1].data.shift();
    }

    // Force chart update by creating new references
    this.heartRateChartData = { ...this.heartRateChartData };
    this.bloodPressureChartData = { ...this.bloodPressureChartData };
  }

  private updateThresholds(settings: ThresholdSettings): void {
    this.HEART_RATE_THRESHOLDS = settings.heartRate;
    this.BLOOD_PRESSURE_THRESHOLDS = settings.bloodPressure;
  }

  private getBloodPressureStatus(value: number, type: 'systolic' | 'diastolic'): 'normal' | 'warning' | 'critical' {
    const prevStatus = this.currentBloodPressure[type].status;
    const settings = this.settingsService.getCurrentSettings();
    const thresholds = type === 'systolic' ? settings.bloodPressure.systolic : settings.bloodPressure.diastolic;
    
    let status: 'normal' | 'warning' | 'critical';
    if (value < thresholds.critical.min || value > thresholds.critical.max) {
      status = 'critical';
    } else if (value < thresholds.warning.min || value > thresholds.warning.max) {
      status = 'warning';
    } else {
      status = 'normal';
    }

    // Show notification if status has changed to warning or critical
    if (prevStatus !== status && (status === 'warning' || status === 'critical')) {
      this.notificationService.showAlert(
        `Blood Pressure ${type} Alert`,
        `Blood pressure ${type} is ${status}: ${value} mmHg`,
        status
      );
    }

    return status;
  }

  private updateChartTheme(isDarkMode: boolean): void {
    const textColor = isDarkMode ? '#f8f9fa' : '#212529';
    const gridColor = isDarkMode ? '#495057' : '#e9ecef';

    if (this.chartOptions && this.chartOptions.plugins) {
      this.chartOptions = {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          legend: this.chartOptions.plugins.legend ? {
            ...this.chartOptions.plugins.legend,
            labels: { color: textColor }
          } : undefined,
          tooltip: this.chartOptions.plugins.tooltip ? {
            ...this.chartOptions.plugins.tooltip,
            backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: isDarkMode ? '#404040' : '#e0e0e0'
          } : undefined
        },
        scales: {
          ...this.chartOptions.scales,
          ['y']: {
            ...this.chartOptions.scales?.['y'],
            grid: { color: gridColor },
            ticks: { color: textColor },
            title: {
              ...this.chartOptions.scales?.['y']?.title,
              color: textColor
            }
          },
          ['x']: {
            ...this.chartOptions.scales?.['x'],
            grid: { color: gridColor },
            ticks: { color: textColor },
            title: {
              ...this.chartOptions.scales?.['x']?.title,
              color: textColor
            }
          }
        }
      };
    }
  }

  public getStatusClass(status: 'normal' | 'warning' | 'critical'): string {
    return `status-${status}`;
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      clearInterval(this.updateInterval);
    } else {
      this.startRealTimeUpdates();
    }
  }

  public openSettings(): void {
    this.settingsDialog.open();
  }

  public clearHistoricalData(): void {
    this.historicalData = [];
  }
}
