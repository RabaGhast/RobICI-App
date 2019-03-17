import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService } from '../data.service';

@Component({
  selector: 'app-viz',
  templateUrl: './viz.component.html',
  styleUrls: ['./viz.component.scss']
})
export class VizComponent implements OnInit {

  viz = new Viz({ Module, render });
  vizWindow;
  svg: SafeHtml;
  scrolling: boolean;
  mousePosX: number;
  mousePosY: number;
  size: number;
  zoomScale: number;

  constructor(private sanitizer: DomSanitizer, private dataService: DataService) { }

  ngOnInit() {
    this.size = 10;
    this.zoomScale = 5;
    // this.dataService.test();
    this.displayViz(this.size, true);
    this.dataService.subscribeAllSignals();
    this.dataService.signalUpdates.subscribe(s => {
      const parent = document.getElementById(s.nodeName);
      if (parent) {
        parent.childNodes[7].textContent = s.value + ' ' + s.unit;
      }
    });
  }

  displayViz(size: number, firstTime: boolean) {
    console.log(this.size);
    this.dataService.getGraphString(this.size, firstTime).then(graphData => {
      console.log(graphData);
      this.viz.renderString(graphData)
        .then(result => {
          this.svg = this.sanitizer.bypassSecurityTrustHtml(result);
          if (firstTime) { console.log(graphData); }
        })
        .catch(error => {
          // Create a new Viz instance (@see Caveats page for more info)
          this.viz = new Viz({ Module, render });

          // Possibly display the error
          console.error(error);
        });
    });
  }

  zoomOut() {
    if (this.size - this.zoomScale >= 5) {
      this.size -= this.zoomScale;
      this.displayViz(this.size, false);
    }
  }
  zoomIn() {
    if (this.size + this.zoomScale <= 30) {
      this.size += this.zoomScale;
      this.displayViz(this.size, false);
    }
  }

  isScrolling(): boolean {
    return this.scrolling;
  }

  setScrolling(bool: boolean): void {
    console.log('isScrolling: ');
    this.scrolling = bool;
  }

  getMaxHeight(): number {
    return window.outerHeight;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown($event: KeyboardEvent) {
    if ($event.keyCode === 17) {
      document.body.style.cursor = 'zoom-in';
      $event.preventDefault();
    } else if ($event.keyCode === 32) {
      this.scrolling = true;
      $event.preventDefault();
      document.body.style.cursor = 'move';
    }
  }
  @HostListener('window:keyup', ['$event'])
  onKeyUp($event: KeyboardEvent) {
    document.body.style.cursor = 'default';
    if ($event.keyCode === 32) {
      this.scrolling = false;
      this.mousePosX = null;
      this.mousePosY = null;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e) {
    if (!this.scrolling) {
      return;
    }
    if (this.mousePosX != null) {
      const scrollSpeed = 3;
      const scrollX = (this.mousePosX - e.screenX) * scrollSpeed;
      const scrollY = (this.mousePosY - e.screenY) * scrollSpeed;
      document.getElementById('vizBox').scrollLeft += scrollX;
      document.getElementById('vizBox').scrollTop += scrollY;
    }
    this.mousePosX = e.screenX;
    this.mousePosY = e.screenY;

  }
}
