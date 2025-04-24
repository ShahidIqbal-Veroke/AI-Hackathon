import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ThresholdSettings } from '../../services/settings.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-overlay" *ngIf="isOpen" (click)="close()">
      <div class="settings-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Alert Threshold Settings</h2>
          <button class="close-button" (click)="close()">✕</button>
        </div>

        <div class="dialog-content">
          <div class="settings-section">
            <h3>Heart Rate Thresholds (BPM)</h3>
            <div class="threshold-group">
              <div class="threshold-row">
                <label>Normal Range:</label>
                <input type="number" [(ngModel)]="settings.heartRate.normal.min" (change)="validateHeartRate()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.heartRate.normal.max" (change)="validateHeartRate()">
              </div>
              <div class="threshold-row">
                <label>Warning Range:</label>
                <input type="number" [(ngModel)]="settings.heartRate.warning.min" (change)="validateHeartRate()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.heartRate.warning.max" (change)="validateHeartRate()">
              </div>
              <div class="threshold-row">
                <label>Critical Range:</label>
                <input type="number" [(ngModel)]="settings.heartRate.critical.min" (change)="validateHeartRate()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.heartRate.critical.max" (change)="validateHeartRate()">
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>Blood Pressure Thresholds (mmHg)</h3>
            <div class="threshold-group">
              <h4>Systolic</h4>
              <div class="threshold-row">
                <label>Normal Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.normal.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.normal.max" (change)="validateBloodPressure()">
              </div>
              <div class="threshold-row">
                <label>Warning Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.warning.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.warning.max" (change)="validateBloodPressure()">
              </div>
              <div class="threshold-row">
                <label>Critical Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.critical.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.systolic.critical.max" (change)="validateBloodPressure()">
              </div>

              <h4>Diastolic</h4>
              <div class="threshold-row">
                <label>Normal Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.normal.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.normal.max" (change)="validateBloodPressure()">
              </div>
              <div class="threshold-row">
                <label>Warning Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.warning.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.warning.max" (change)="validateBloodPressure()">
              </div>
              <div class="threshold-row">
                <label>Critical Range:</label>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.critical.min" (change)="validateBloodPressure()">
                <span>to</span>
                <input type="number" [(ngModel)]="settings.bloodPressure.diastolic.critical.max" (change)="validateBloodPressure()">
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="reset-button" (click)="resetToDefault()">Reset to Default</button>
          <div class="action-buttons">
            <button class="cancel-button" (click)="close()">Cancel</button>
            <button class="save-button" (click)="save()">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialogComponent implements OnInit {
  isOpen = false;
  settings!: ThresholdSettings;
  private originalSettings!: ThresholdSettings;

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.loadSettings();
  }

  open() {
    this.loadSettings();
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  private loadSettings() {
    this.settings = JSON.parse(JSON.stringify(this.settingsService.getCurrentSettings()));
    this.originalSettings = JSON.parse(JSON.stringify(this.settings));
  }

  validateHeartRate() {
    const hr = this.settings.heartRate;
    // Ensure ranges don't overlap and are in ascending order
    hr.normal.min = Math.min(hr.normal.max, hr.normal.min);
    hr.warning.min = Math.max(hr.normal.max, Math.min(hr.warning.max, hr.warning.min));
    hr.critical.min = Math.max(hr.warning.max, Math.min(hr.critical.max, hr.critical.min));
  }

  validateBloodPressure() {
    const bp = this.settings.bloodPressure;
    // Validate systolic
    bp.systolic.normal.min = Math.min(bp.systolic.normal.max, bp.systolic.normal.min);
    bp.systolic.warning.min = Math.max(bp.systolic.normal.max, Math.min(bp.systolic.warning.max, bp.systolic.warning.min));
    bp.systolic.critical.min = Math.max(bp.systolic.warning.max, Math.min(bp.systolic.critical.max, bp.systolic.critical.min));

    // Validate diastolic
    bp.diastolic.normal.min = Math.min(bp.diastolic.normal.max, bp.diastolic.normal.min);
    bp.diastolic.warning.min = Math.max(bp.diastolic.normal.max, Math.min(bp.diastolic.warning.max, bp.diastolic.warning.min));
    bp.diastolic.critical.min = Math.max(bp.diastolic.warning.max, Math.min(bp.diastolic.critical.max, bp.diastolic.critical.min));
  }

  save() {
    this.settingsService.updateSettings(this.settings);
    this.close();
  }

  resetToDefault() {
    this.settingsService.resetToDefault();
    this.loadSettings();
  }
}
