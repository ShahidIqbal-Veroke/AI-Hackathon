import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface MetricsData {
  heartRate: number;
  systolic: number;
  diastolic: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private apiUrl = 'http://192.168.1.33:3008/api/metrics/chart';

  constructor(private http: HttpClient) { }

  getMetrics(): Observable<MetricsData[]> {
    return this.http.get<MetricsData[]>(this.apiUrl).pipe(
      map(data => {
        // Ensure data is properly formatted
        return data.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString() // Ensure timestamp is in correct format
        }));
      }),
      catchError(error => {
        console.error('Error fetching metrics:', error);
        return throwError(() => new Error('Failed to fetch metrics data'));
      })
    );
  }

  // Add a method to get initial historical data
  getHistoricalData(): Observable<MetricsData[]> {
    return this.http.get<MetricsData[]>(this.apiUrl).pipe(
      map(data => {
        // Sort data by timestamp in ascending order
        return data.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }),
      catchError(error => {
        console.error('Error fetching historical data:', error);
        return throwError(() => new Error('Failed to fetch historical data'));
      })
    );
  }
} 