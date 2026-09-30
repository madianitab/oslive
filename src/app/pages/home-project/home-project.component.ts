import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-home-project',
    templateUrl: './home-project.component.html',
    styleUrls: ['./home-project.component.css'],
    standalone: true,
    imports: [RouterLink]
})
export class HomeProjectComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
