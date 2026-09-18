import { Component } from '@angular/core';

import { INavData } from '@coreui/angular';
import { navItems } from './_nav';
import { CurrentUserService } from 'src/app/shared/services/current-user.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
})
export class DefaultLayoutComponent {

  /**
   * Menu visible. Al SuperAdmin se le anade el panel de plataforma.
   *
   * Esto decide QUE SE MUESTRA, no quien puede entrar: la ruta tiene su guard y,
   * sobre todo, la API exige el rol. Quitar la entrada del menu no protegeria nada.
   */
  public navItems: INavData[] = [];

  private buildNav(): INavData[] {
    const items: INavData[] = [
      ...navItems,
      { name: 'Documentos', url: '/companydocuments', iconComponent: { name: 'cil-folder' } },
      { name: 'Mi suscripción', url: '/subscription', iconComponent: { name: 'cil-credit-card' } },
    ];
    if (this.currentUser.isSuperAdmin) {
      items.push({
        name: 'Plataforma',
        url: '/platform',
        iconComponent: { name: 'cil-settings' },
      });
    }
    return items;
  }

  constructor(private currentUser: CurrentUserService) {
    this.navItems = this.buildNav();
  }
}
