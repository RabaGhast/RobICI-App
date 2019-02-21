import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-tester',
  templateUrl: './tester.component.html',
  styleUrls: ['./tester.component.scss']
})
export class TesterComponent implements OnInit {

  output: string;

  constructor(private dataService: DataService) {
    this.output = 'no output yet';
   }

  ngOnInit() {
    /*
    this.dataService.test().then(res => {
      this.output = res;
    });
    */
  }

}
