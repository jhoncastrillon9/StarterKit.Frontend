import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TruncatePipe } from './pipes/truncate.pipe';
import { CapitalizePipe } from './pipes/capitalize.pipe';

@NgModule({
  declarations: [TruncatePipe, CapitalizePipe],  // Declaras las pipes
  imports: [CommonModule],
  exports: [TruncatePipe, CapitalizePipe]        // Exportas las pipes
})
export class SharedModule {}