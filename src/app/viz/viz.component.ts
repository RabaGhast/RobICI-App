import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService } from '../data.service';
import * as svgPanZoomNamespace from 'svg-pan-zoom';
import { $ } from 'protractor';
import { stringify } from '@angular/compiler/src/util';
import { Signal } from '../Models/Signal';


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
  public scheme: SvgPanZoom.Instance;
  animateUpdates = true;
  animConf = { // controls opacity for update animation
    minFill: 0,
    maxFill: .8,
    fps: 30,
    cooldown: 1,
    inc: () => {return (this.animConf.maxFill-this.animConf.minFill)/(this.animConf.fps*this.animConf.cooldown)},
    freq: () => { return 1000/this.animConf.fps }
  }
  //@ViewChild('svg') public canvas: ElementRef;

  constructor(private sanitizer: DomSanitizer, private dataService: DataService) { }

  ngOnInit() {
    this.size = 30;
    this.zoomScale = 5;
    // this.dataService.test();
    this.displayViz(this.size, true);
    this.dataService.subscribeAllSignals();
    this.dataService.signalUpdates.subscribe(s => {
      const parent = document.getElementById(s.nodeName);
      if (parent) {
        this.updateValue(s, parent);
      }
    });
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit');
    this.fixCanvas();
  }

  updateValue(signal: Signal, parent: HTMLElement) {
    parent.childNodes[7].textContent = signal.value + ' ' + signal.unit;
    const ellipse = parent.getElementsByTagName('ellipse')[0];

    // if animations are enabled
    if(this.animateUpdates) {
      // change opacity
      ellipse.setAttribute('fill-opacity', this.animConf.minFill+'');
      // run animation function if it's not already running
      if(ellipse.getAttribute('animating') != 'true') {
        ellipse.setAttribute('animating', 'true');
        this.animate(ellipse);
      }
    }    
  }

  async animate(ellipse: SVGEllipseElement): Promise<void> {
    let currOpacity = parseFloat(ellipse.getAttribute('fill-opacity'));
    while(currOpacity < this.animConf.maxFill) {
      ellipse.setAttribute('fill-opacity', currOpacity+this.animConf.inc() + '')
      await new Promise(resolve => setTimeout(resolve, this.animConf.freq())); 
      currOpacity = parseFloat(ellipse.getAttribute('fill-opacity'));
    }
    ellipse.setAttribute('animating', 'false');
  }

  displayViz(size: number, firstTime: boolean) {
    //console.log(this.size);
    this.dataService.getGraphString(this.size, firstTime).then(graphData => {
      //console.log(graphData);
      this.viz.renderString(graphData)
        .then(result => {
          this.svg = this.sanitizer.bypassSecurityTrustHtml(result);
          //if (firstTime) { console.log(graphData); }
        })
        .catch(error => {
          // Create a new Viz instance (@see Caveats page for more info)
          this.viz = new Viz({ Module, render });

          // Possibly display the error
          console.error(error);
        });
    });
  }

  // Allow for pan and zoom, and fix text issues
  async fixCanvas() {
    while(document.getElementsByTagName('svg').length <= 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // add SVG pan and zoom functionality
    const canvas = document.getElementsByTagName('svg')[0];
    this.scheme = svgPanZoomNamespace(canvas, {
      zoomScaleSensitivity: 0.9,
      minZoom: .5,
      maxZoom: 2,
      dblClickZoomEnabled: false,
      fit: false,
      contain: true
    });


    this.scheme.zoom(.5);
    this.scheme.fit();


    // fixing node color
    const ellipses = document.getElementsByTagName('ellipse');
    for(let i = 0; i < ellipses.length; i++) {
      ellipses[i].setAttribute('fill', 'lightGreen');
      ellipses[i].setAttribute('fill-opacity', this.animConf.maxFill+'');
      ellipses[i].setAttribute('animating', 'false');
    }

    // fix node text
    const texts = document.getElementsByTagName('text');
    for(let i = 0; i < texts.length; i++) {
      // fix horrible viz.js font
      texts[i].style.fontFamily = "'Roboto', sans-serif";
      // remove empty "SignalName: SignalValue" fields
      if(texts[i].innerHTML == 'signalValue') {
        texts[i].innerHTML = '';
        texts[i].setAttribute('text-anchor', 'middle');
        const newVal = parseInt(texts[i].getAttribute('x'), 10) + 35;
        texts[i].setAttribute('x',  newVal.toString() );
        
      }
    }    
    
  }

  getMaxHeight(): number {
    return window.outerHeight;
  }

  /*
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
  */
}
