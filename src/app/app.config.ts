import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
// ng2-charts v5 doesn't require provideCharts
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Charts configuration is handled in the component
    provideAnimations(),
    provideHttpClient()
  ]
};
