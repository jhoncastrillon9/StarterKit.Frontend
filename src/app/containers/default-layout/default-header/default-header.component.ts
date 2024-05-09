import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { ClassToggleService, HeaderComponent } from '@coreui/angular';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
})
export class DefaultHeaderComponent extends HeaderComponent implements OnInit {

  @Input() sidebarId: string = "sidebar";

  public newMessages = new Array(4)
  public newTasks = new Array(5)
  public newNotifications = new Array(5)

  public userEmail?: string;

  constructor(private classToggler: ClassToggleService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit() {
    const tokenDataString = localStorage.getItem('tokenData');
    if (tokenDataString) {
      const tokenData = JSON.parse(tokenDataString);
      this.userEmail = tokenData.Email;
    }
  }

  signoff() {
    // Limpiar datos de usuario en el almacenamiento local
    localStorage.removeItem('tokenData');
    // Redirigir a la página de inicio de sesión
    this.router.navigate(['/login']);    
  }



}
