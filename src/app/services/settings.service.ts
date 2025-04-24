import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ThresholdSettings {
  heartRate: {
    normal: { min: number; max: number };
    warning: { min: number; max: number };
    critical: { min: number; max: number };
  };
  bloodPressure: {
    systolic: {
      normal: { min: number; max: number };
      warning: { min: number; max: number };
      critical: { min: number; max: number };
    };
    diastolic: {
      normal: { min: number; max: number };
      warning: { min: number; max: number };
      critical: { min: number; max: number };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'health-dashboard-thresholds';
  private defaultSettings: ThresholdSettings = {
    heartRate: {
      normal: { min: 60, max: 100 },
      warning: { min: 50, max: 120 },
      critical: { min: 40, max: 140 }
    },
    bloodPressure: {
      systolic: {
        normal: { min: 90, max: 120 },
        warning: { min: 80, max: 140 },
        critical: { min: 70, max: 160 }
      },
      diastolic: {
        normal: { min: 60, max: 80 },
        warning: { min: 50, max: 90 },
        critical: { min: 40, max: 100 }
      }
    }
  };

  private thresholdSettings = new BehaviorSubject<ThresholdSettings>(this.loadSettings());
  thresholdSettings$ = this.thresholdSettings.asObservable();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): ThresholdSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : this.defaultSettings;
  }

  updateSettings(settings: ThresholdSettings) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.thresholdSettings.next(settings);
  }

  resetToDefault() {
    this.updateSettings(this.defaultSettings);
  }

  getCurrentSettings(): ThresholdSettings {
    return this.thresholdSettings.value;
  }
}
