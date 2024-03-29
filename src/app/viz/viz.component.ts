import { Component, OnInit } from '@angular/core';
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService } from '../data.service';
import * as svgPanZoomNamespace from 'svg-pan-zoom';
import { Signal } from '../Models/Signal';
import { environment } from 'src/environments/environment';


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
  zoomScale: number;
  public scheme: SvgPanZoom.Instance;
  animateSensors = environment.node_animation_settings.animate_sensors;
  animateAlarms = environment.node_animation_settings.animate_alarms;
  animConf: any;
  //@ViewChild('svg') public canvas: ElementRef;

  constructor(private sanitizer: DomSanitizer, private dataService: DataService) { }

  ngOnInit() {
    this.animConf = environment.node_animation_settings;
    this.animConf.inc = () => {return (this.animConf.maxFill-this.animConf.minFill)/(this.animConf.fps*this.animConf.cooldown)};
    this.animConf.freq = () => { return 1000/this.animConf.fps }
    /* // If testing mobile with local .exe server: uncomment this section and comment out drawGraph() below.
       // Since server endpoint is local .exe, mobile only works with static graph data.
    const graphData = 'digraph { ratio="0.72" size="30" margin="2" center="true" node [shape=circle,color=red,fillcolor=white]; A1NeedleOut;A1Needle;A1M1Out;A1M1;A1Pump1;A1M2Out;A1M2;A1Pump2;A1Fluid1;A1Fluid;A1Atom;A1ShapeIPOut;A1ShapeIP;A1ShapePSensor;A1ShapePS;A1ShapeDPSensor;A1ShapeDPS;A1ShapeFS;A1Shape;A1; A1NeedleOut [label = <<b>A1NeedleOut</b><br/>signalValue>, id = "A1NeedleOut"]; A1Needle [label = <<b>A1Needle</b><br/>signalValue>, id = "A1Needle"]; A1M1Out [label = <<b>A1M1Out</b><br/>signalValue>, id = "A1M1Out"]; A1M1 [label = <<b>A1M1</b><br/>signalValue>, id = "A1M1"]; A1Pump1 [label = <<b>A1Pump1</b><br/>signalValue>, id = "A1Pump1"]; A1M2Out [label = <<b>A1M2Out</b><br/>signalValue>, id = "A1M2Out"]; A1M2 [label = <<b>A1M2</b><br/>signalValue>, id = "A1M2"]; A1Pump2 [label = <<b>A1Pump2</b><br/>signalValue>, id = "A1Pump2"]; A1Fluid1 [label = <<b>A1Fluid1</b><br/>signalValue>, id = "A1Fluid1"]; A1Fluid [label = <<b>A1Fluid</b><br/>signalValue>, id = "A1Fluid"]; A1Atom [label = <<b>A1Atom</b><br/>signalValue>, id = "A1Atom"]; A1ShapeIPOut [label = <<b>A1ShapeIPOut</b><br/>signalValue>, id = "A1ShapeIPOut"]; A1ShapeIP [label = <<b>A1ShapeIP</b><br/>signalValue>, id = "A1ShapeIP"]; A1ShapePSensor [label = <<b>A1ShapePSensor</b><br/>signalValue>, id = "A1ShapePSensor"]; A1ShapePS [label = <<b>A1ShapePS</b><br/>signalValue>, id = "A1ShapePS"]; A1ShapeDPSensor [label = <<b>A1ShapeDPSensor</b><br/>signalValue>, id = "A1ShapeDPSensor"]; A1ShapeDPS [label = <<b>A1ShapeDPS</b><br/>signalValue>, id = "A1ShapeDPS"]; A1ShapeFS [label = <<b>A1ShapeFS</b><br/>signalValue>, id = "A1ShapeFS"]; A1Shape [label = <<b>A1Shape</b><br/>signalValue>, id = "A1Shape"]; A1 [label = <<b>A1</b><br/>signalValue>, id = "A1"]; A1Needle->A1NeedleOut[label=Output]; A1M1->A1M1Out[label=Output]; A1Pump1->A1M1[label=Output]; A1M2->A1M2Out[label=Output]; A1Pump2->A1M2[label=Output]; A1Fluid1->A1Pump1[label=CompA]; A1Fluid1->A1Pump2[label=CompB]; A1Fluid->A1Fluid1[label=Output]; A1ShapeIP->A1ShapeIPOut[label=Output]; A1ShapePS->A1ShapePSensor[label=Input]; A1ShapeDPS->A1ShapeDPSensor[label=Input]; A1ShapeFS->A1ShapePS[label=Press]; A1ShapeFS->A1ShapeDPS[label=Delta]; A1Shape->A1ShapeIP[label=Output]; A1Shape->A1ShapeFS[label=Actual]; A1->A1Needle[label=Needle]; A1->A1Fluid[label=Fluid]; A1->A1Atom[label=Atom]; A1->A1Shape[label=Shape]; }'
    this.viz.renderString(graphData).then(result => { this.svg = this.sanitizer.bypassSecurityTrustHtml(result); })
    */
    this.drawGraph();
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

  drawGraph() {
    //console.log(this.size);
    this.dataService.getGraphString().then(graphData => {
      console.log(graphData);
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

  updateValue(signal: Signal, parent: HTMLElement) {

    let ellipse = parent.getElementsByTagName('ellipse')[0];
    let diamond = parent.getElementsByTagName('polygon')[0];

    // if sensor
    if (ellipse) { 
      // update value. Include unit of measure if available
      if (signal.unit == undefined) {
        parent.childNodes[7].textContent = signal.value + '';
      } else {
        parent.childNodes[7].textContent = signal.value + ' ' + signal.unit;
      }
      // if animation is on, animate
      if (this.animateSensors) {
        // change opacity
        ellipse.setAttribute('fill-opacity', this.animConf.minFill + '');
        // run animation function if it's not already running
        if (ellipse.getAttribute('animating') != 'true') {
          ellipse.setAttribute('animating', 'true');
          this.animateSensor(ellipse);
        }
      }
      
    // if alarm
    } else if (diamond) { 
      if(signal.value == environment.false_alarm_value) { 
        parent.childNodes[7].textContent = 'False';
        if(this.animateAlarms) diamond.setAttribute('fill', environment.node_style_settings.alarm.color_off); 
      } else {
        parent.childNodes[7].textContent = 'True';
        if(this.animateAlarms) diamond.setAttribute('fill', environment.node_style_settings.alarm.color_on); 
      }
    }
  }

  async animateSensor(ellipse: SVGEllipseElement): Promise<void> {
    let currOpacity = parseFloat(ellipse.getAttribute('fill-opacity'));
    while(currOpacity < this.animConf.maxFill) {
      ellipse.setAttribute('fill-opacity', currOpacity+this.animConf.inc() + '')
      await new Promise(resolve => setTimeout(resolve, this.animConf.freq())); 
      currOpacity = parseFloat(ellipse.getAttribute('fill-opacity'));
    }
    ellipse.setAttribute('animating', 'false');
  }

  // Allow for pan and zoom. Also fixes text and color issues
  async fixCanvas() {
    while(document.getElementsByTagName('svg').length <= 0) {
      await new Promise(resolve => setTimeout(resolve, environment.zoom_scale_timeout));
    }

    // add SVG pan and zoom functionality
    const canvas = document.getElementsByTagName('svg')[0];
    this.scheme = svgPanZoomNamespace(canvas, environment.zoom_scale_settings);

    // fixing node color - Viz.js seems to not display color correctly. This fix is not necessary in other GraphViz environments
    const ellipses = document.getElementsByTagName('ellipse');
    for(let i = 0; i < ellipses.length; i++) {
      ellipses[i].setAttribute('fill', environment.node_style_settings.sensor.color);
      ellipses[i].setAttribute('fill-opacity', this.animConf.maxFill+'');
      ellipses[i].setAttribute('animating', 'false');
    }
    const nodes = [].slice.call(document.getElementsByClassName('node'));
    const diamonds = nodes.map(n => n.children[1]).filter(n => n['nodeName'] == 'polygon');
    for(let i = 0; i < diamonds.length; i++) {
      diamonds[i].setAttribute('fill', environment.node_style_settings.alarm.color_off);
    }    

    // fix node text
    const texts = document.getElementsByTagName('text');
    for(let i = 0; i < texts.length; i++) {
      // change viz.js font
      texts[i].style.fontFamily = environment.node_style_settings.font;
      // remove empty "SignalName: SignalValue" placeholder fields fields
      if(texts[i].innerHTML == 'signalValue') {
        texts[i].innerHTML = '';
        texts[i].setAttribute('text-anchor', 'middle');
        const newX = parseInt(texts[i].getAttribute('x'), 10) + 35;
        texts[i].setAttribute('x',  newX.toString() );
        const newY = parseInt(texts[i].getAttribute('y'), 10) + 10;
        texts[i].setAttribute('y',  newY.toString() );
        
      }
    }    
  }

  getMaxHeight(): number {
    return window.outerHeight;
  }

  zoomOut(): void {
    this.scheme.zoomOut();
  }
  zoomIn(): void {
    this.scheme.zoomIn();
  }
}
