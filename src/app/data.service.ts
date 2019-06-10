import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphNode } from './Models/GraphNode';
import { Link } from './Models/Link';
import { Signal } from './Models/Signal';
import { Observable, Subject, Subscription } from 'rxjs';
import { FormatterService } from './formatter.service';
import { Client as WebSocket } from 'rpc-websockets';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  wsUrl: string;
  nodeArr: Array<GraphNode>;
  signals: Array<Signal>;
  signalUpdates: Subject<Signal>;
  ws: WebSocket;
  handleDict: Array<{handle: number, signal: Signal}>;
  hasAlerted: boolean;

  constructor(private http: HttpClient, private formatter: FormatterService) {
    this.wsUrl = environment.websocket_url;
    this.nodeArr = new Array<GraphNode>();
    this.signals = new Array<Signal>();
    this.signalUpdates = new Subject<Signal>();
    this.ws = new WebSocket(this.wsUrl);
    this.handleDict = new Array<{handle: number, signal: Signal}>();
  }

  /*-------------------------------- Graph data -------------------------------------*/

  public async getGraphString(): Promise<string> {
    this.nodeArr = new Array<GraphNode>();
    // wait until everything done before returning:
    this.ws.on('error', (error) => {
      console.error(error);
      if (!this.hasAlerted) {
        alert(`Error! Websockets threw error when sending request to ${error.target.url}. Is the CTM Server available?`)
        this.hasAlerted = true;
      }
      console.warn('ws error!')
    });
    this.ws.on('connection', () => {
      console.warn('ws connection!')
    });
    this.ws.on('listening', () => {
      console.warn('ws listening!')
    });
    return new Promise(resolveString => {
      // wait until websocket is open before continuing:
      new Promise(resolveOpen => {
        this.ws.on('open', resolveOpen);
      }).then(async () => {
        console.warn('ws opening!')
        await this.getGraphStructure({ 'Device': environment.root_node });
        //await this.readAllSignals(); // <- Does not need to run this. It improves speed slightly by requesting an initial set of signals.
        resolveString(this.formatter.formatGraphString(this.nodeArr));
      });
    });
  }

  private async getGraphStructure(params: Object): Promise<GraphNode> {
    const node = new GraphNode([params['Device']], 'sensor', '', null);
    const children = await this.ws.call('IPS.Device.Connections', params); // get children of node in "params". children contains a list of out-edges with a label and a target node.
    for (let i = 0; i < children.length; i++) {
      let childName;
      const child = children[i];
      if (child['Target'] != null) { // if this actually is a child node. for some reason, some connections have no target node.
        if (node.outEdges == null) {
          node.outEdges = new Array<Link>();
        }
        childName = (child['Target'] + '').split('.')[0];
        const childNode = await this.getGraphStructure({ 'Device': childName });
        node.outEdges.push(new Link(childNode, child['Name']));
      }
    }
    // alternative to the below alarm check: check if unit is defined for signal in fetchAllSignals. Seems to coincide with this check
    // it also feels more right that an alarm has no unit of measurement. The below check seems more arbitrary (but orig solution used this though)
    const isAlarm = !(children.length > 0 && children.filter(c => c['Target'] != null).length > 0 || children.filter(c => c['Supervise'] != null).length > 0);
    if (isAlarm) {
      node.type = 'alarm';
    } else {
      node.type = 'sensor';
    }
    this.nodeArr.push(node);
    return node;
  }

  /*-------------------------------- Subscriptions -------------------------------------*/

  public async subscribeAllSignals() {
    await this.ws.on('open', async () => {
      if(this.hasAlerted) {
        console.warn('should now restart everything!!!')
      }
      this.hasAlerted = false;
      await this.fetchAllSignals();
      await this.handleSubscriptions();
      this.enableSubscriptions();
      this.signals.forEach(async s => {
        await this.signalSubscribe(s);
      });
    });
    // ws.close();
  }

  private async fetchAllSignals(): Promise<void> {
    this.signals = new Array<Signal>();

    let signalList = await this.ws.call('Signal.List', {}) as Array<{ path: string, type: string, unit: string }>;

    // only keep "SetPoint" and "Value" named signals
    signalList = signalList.filter(s => s.path.split(':')[1] === 'SetPoint' || s.path.split(':')[1] === 'Value');

    signalList.forEach(s => {
      const signal = new Signal(s.path, null, s.unit);
      this.signals.push(signal);
    });
    return;
  }

  private async handleSubscriptions(): Promise<void> {
    await this.ws.on('Signal.OnUpdate', res => {
      res.forEach(r => {
        const resHandle = r[0];
        const resValue = r[1];
        const handles = this.signals.filter(s => s.handle === resHandle); // find signals with matching handle value

        // if this is first time signal is updated and therefore has no handle:
        if (handles.length <= 0) {
          const unSetSignals = this.signals.filter(s => s.handle === -1);
          // console.log('unSetSignals:', unSetSignals);
          unSetSignals[0].handle = resHandle;
          unSetSignals[0].value = resValue;
        this.addSignalUpdate(unSetSignals[0]);
        } else if (handles.length === 1) {
          handles[0].handle = resHandle;
          handles[0].value = resValue;
          this.addSignalUpdate(handles[0]);
        } else {
          console.error('found more than one signal!');
        }
      });
    });
  }

  private addSignalUpdate(signal: Signal) {
    this.signalUpdates.next(signal);
  }

  private async enableSubscriptions(): Promise<void> {
    await this.ws.call('Signal.Subscription', { 'rate': environment.subscription_interval }); // Tells the server how often it should send updates
    await this.ws.subscribe('Signal.OnUpdate') // this sends a request to the server. server responds with error. this step is necessary
      .catch(error => {
        // ignore error
      });
  }

  // not currently used but might be useful
  private async disableSubscriptions(ws: WebSocket): Promise<void> {
    await ws.unsubscribe('Signal.OnUpdate') // this sends a request to the server. server responds with error. this step is necessary
      .catch(error => {
        // ignore error
      });
  }

  private async signalSubscribe(signal: Signal): Promise<void> {
    const signalIdx = this.signals.findIndex(s => s === signal);
    this.signals[signalIdx].handle = -1;
    return await this.ws.call('Signal.Subscribe', { 'path': signal.nodeName + ':' + signal.valueName });
  }

  // // NOTE: TESTING
  // public async getAllSignalValues() {
  //   const list = new Array<any>();
  //   this.signals.forEach(async s => {
  //     this.ws.call('Signal.List', {}) as Array<{ path: string, type: string, unit: string }>;
  //   });
  // }
  
}
