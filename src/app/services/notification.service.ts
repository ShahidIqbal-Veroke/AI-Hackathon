import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private hasPermission = false;

  constructor() {
    this.requestPermission();
  }

  private async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
    }
  }

  showAlert(title: string, message: string, type: 'warning' | 'critical') {
    // Show browser notification if permitted
    if (this.hasPermission) {
      const icon = type === 'warning' ? '⚠️' : '🚨';
      new Notification(`${icon} ${title}`, {
        body: message,
        icon: type === 'warning' ? '/assets/warning.png' : '/assets/critical.png',
      });
    }

    // Also show an alert toast that will be styled based on the type
    this.showToast(title, message, type);
  }

  private showToast(title: string, message: string, type: 'warning' | 'critical') {
    const toast = document.createElement('div');
    toast.className = `alert-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <strong>${type === 'warning' ? '⚠️' : '🚨'} ${title}</strong>
      </div>
      <div class="toast-body">${message}</div>
    `;

    document.body.appendChild(toast);

    // Slide in animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}
