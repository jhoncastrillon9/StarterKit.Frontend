import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TruncatePipe } from './pipes/truncate.pipe';
import { CapitalizePipe } from './pipes/capitalize.pipe';
import { FilterByPipe } from './pipes/FilterBy.pipe';


@NgModule({
  declarations: [TruncatePipe, CapitalizePipe, FilterByPipe ],  // Declaras las pipes
  imports: [CommonModule],
  exports: [TruncatePipe, CapitalizePipe, FilterByPipe]        // Exportas las pipes
})
export class SharedModule {}