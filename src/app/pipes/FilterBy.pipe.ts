import { Pipe, PipeTransform } from '@angular/core';
import { ApuModel } from '../modules/apus/models/apu.Model';

@Pipe({name: 'filterBy'})
export class FilterByPipe implements PipeTransform {
  transform(items: ApuModel[], searchTerm: string): ApuModel[] {
    if (!items || !searchTerm) {
      return items;
    }
    searchTerm = searchTerm.toLowerCase();
    return items.filter(item => 
      item.itemName.toLowerCase().includes(searchTerm) ||
      item.subChapterName.toLowerCase().includes(searchTerm)
    );
  }
}
