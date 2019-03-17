import { Component, OnInit, Output } from '@angular/core';
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

    // this.dataService.signalSubscribe().subscribe({
    //   next(res) {
    //     console.log('subscribe next: ', res);
    //     this.output = JSON.stringify(res.result);
    //   }
    //   ,
    //   error(msg) {
    //     console.log('subscribe error: ', msg);
    //     this.output = JSON.stringify(msg);
    //   },
    //   complete() {
    //     console.log('subscribe completed');
    //     this.output = JSON.stringify('subscribe completed');
    //   }
    // });

  }

}
