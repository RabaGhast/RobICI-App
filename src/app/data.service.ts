import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphNode } from './Models/GraphNode';
import { Link } from './Models/Link';
import { Signal } from './Models/Signal';
import { JsonrpcResponse } from './Models/JsonrpcResponse';
import { Observable, Subject, Subscription } from 'rxjs';
import { FormatterService } from './formatter.service';
import { Client as WebSocket } from 'rpc-websockets';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  url: string;
  wsUrl: string;
  nodeArr: Array<GraphNode>;
  signals: Array<Signal>;
  signalUpdates: Subject<Signal>;
  ws: WebSocket;
  handleDict: Array<{handle: number, signal: Signal}>;

  constructor(private http: HttpClient, private formatter: FormatterService) {
    this.url = 'http://localhost:8080/jsonrpc';
    this.wsUrl = 'ws://localhost:8080/jsonrpc';
    this.nodeArr = new Array<GraphNode>();
    this.signals = new Array<Signal>();
    this.signalUpdates = new Subject<Signal>();
    this.ws = new WebSocket(this.wsUrl);
    this.handleDict = new Array<{handle: number, signal: Signal}>();
  }

  private addSignalUpdate(signal: Signal) {
    this.signalUpdates.next(signal);
  }

  public async test() {
    console.log('Running tests');
  }


  public async enableSubscriptions(): Promise<void> {
    await this.ws.subscribe('Signal.OnUpdate') // this sends a request to the server. server responds with error. this step is necessary
      .catch(error => {
        // ignore error
      });
  }

  public async disableSubscriptions(ws: WebSocket): Promise<void> {
    await ws.unsubscribe('Signal.OnUpdate') // this sends a request to the server. server responds with error. this step is necessary
      .catch(error => {
        // ignore error
      });
  }

  public async signalSubscribe(signal: Signal, rateInSeconds: number = null): Promise<void> {
    const signalIdx = this.signals.findIndex(s => s === signal);
    // console.log('signalSubscribe signal:', signal, '. signalIdx:', signalIdx);
    if (rateInSeconds) {
      await this.ws.call('Signal.Subscription', { 'rate': 1000 * rateInSeconds });
    }
    this.signals[signalIdx].handle = -1;
    return await this.ws.call('Signal.Subscribe', { 'path': signal.nodeName + ':' + signal.valueName });
  }

  public async handleSubscriptions(): Promise<void> {
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


  public async subscribeAllSignals() {
    await this.ws.on('open', async () => {
      await this.readAllSignals();
      await this.handleSubscriptions();
      this.enableSubscriptions();
      for (let i = 0; i < this.signals.length; i++) {
        await this.signalSubscribe(this.signals[i]);
      }
    });
    // ws.close();
  }

  public testCall(params: Object, method: string): Promise<JsonrpcResponse> {
    const body = JSON.stringify({ 'jsonrpc': '2.0', 'method': method, 'params': params, 'id': 1 });
    const httpOptions = { // post request works without (when using chrome extension). adding httpOptions to post request breaks request.
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.post<JsonrpcResponse>(this.url, body).toPromise();
  }

  public async formattedAllSignals(): Promise<Array<any>> {
    const signals = await this.readAllSignals();
    return this.formatter.formattedAllSignals(signals);
  }

  // Runs readAllSignals as initial value. Then loops for "iterations" iterations where it sleeps for
  // "ms" seconds then readsAllSignals then compares with initial signals
  public async loopSignalCheck(ms: number, iterations: number): Promise<void> {
    console.log(`running loopSignalCheck with ${iterations} iterations`);
    const signals = await this.readAllSignals();
    for (let i = 0; i < iterations; i++) {
      await this.delay(ms);
      const newSignals = await this.readAllSignals();
      const diffSignals = new Array<Signal>();
      signals.forEach(s => {
        const diffSignal = newSignals.filter(ns => (ns.nodeName === s.nodeName && ns.valueName === s.valueName) && ns.value !== s.value);
        if (diffSignal.length > 0) {
          diffSignals.concat(diffSignal);
          diffSignal.forEach(ds => { diffSignals.push(ds); });
        }
      });
      if (diffSignals.length > 0) {
        console.log('found diff signals:',
          diffSignals.map(ds =>
            ({
              name: `${ds.nodeName}:${ds.valueName}`,
              oldValue: signals.find(s => s.nodeName === ds.nodeName && s.valueName === ds.valueName).value,
              newValue: ds.value
            }))
        );
      } else {
        console.log('same as before');
      }
    }
    console.log('loopSignalCheck done');
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async readAllSignals(): Promise<Array<Signal>> {
    const signalArray = Array<Signal>();
    this.signals = new Array<Signal>();

    let signalList = await this.ws.call('Signal.List', {}) as Array<{ path: string, type: string, unit: string }>;

    // only keep "SetPoint" and "Value" named signals
    signalList = signalList.filter(s => s.path.split(':')[1] === 'SetPoint' || s.path.split(':')[1] === 'Value');

    signalList.forEach(s => {
      const signal = new Signal(s.path, null, s.unit);
      signalArray.push(signal);
      this.signals.push(signal);
    });
    return signalArray;
  }

  public async getGraph(params: Object): Promise<GraphNode> {
    const node = new GraphNode([params['Device']], 'sensor', '', null);
    const children = await this.ws.call('IPS.Device.Connections', params); // get children of node in "params"
    for (let i = 0; i < children.length; i++) {
      let childName;
      const child = children[i];
      if (child['Target'] != null) {
        if (node.connectsTo == null) {
          node.connectsTo = new Array<Link>();
        }
        childName = (child['Target'] + '').split('.')[0];
        const childNode = await this.getGraph({ 'Device': childName });
        node.connectsTo.push(new Link(childNode, child['Name']));
      }
    }
    this.nodeArr.push(node);
    return node;
  }

  public async getGraphString(size: number, firstTime: boolean): Promise<string> {
    this.nodeArr = new Array<GraphNode>();
    // wait until everything done before returning:
    if (firstTime) {
      return new Promise(resolveString => {
        // wait until websocket is open before continuing:
        new Promise(resolveOpen => {
          this.ws.on('open', resolveOpen);
        }).then(async () => {
          await this.getGraph({ 'Device': 'A1' });
          await this.readAllSignals();
          resolveString(this.formatter.formatGraphString(size, this.nodeArr, this.signals, firstTime));
        });
      });
    } else {
      return new Promise(resolveString => {
        resolveString(this.formatter.formatGraphString(size, this.nodeArr, this.signals, firstTime));
      });
    }
  }
}
