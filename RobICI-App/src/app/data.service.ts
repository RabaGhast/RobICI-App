import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphNode } from './Models/GraphNode';
import { Link } from './Models/Link';
import { Signal } from './Models/Signal';
import { JsonrpcResponse } from './Models/JsonrpcResponse';
import { Observable } from 'rxjs';
import { FormatterService } from './formatter.service';
// import Client from 'jsonrpc-websocket-client';
import {Client as WebSocket} from 'rpc-websockets';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  url: string;
  wsUrl: string;
  nodeArr: Array<GraphNode>;
  signals: Array<Signal>;

  constructor(private http: HttpClient, private formatter: FormatterService) {
    this.url = 'http://localhost:8080/jsonrpc';
    this.wsUrl = 'ws://localhost:8080/jsonrpc';
    this.nodeArr = new Array<GraphNode>();
    this.signals = new Array<Signal>();
  }

  public async test(): Promise<string> {
    console.log('Running tests');
    let result = 'nothing';
    const outputs = new Array<string>();
    const params = { 'Device': 'A1' };
    const methods = [
      'IPS.Signal.Connections',
      'IPS.Device.Connections',
      'JSONRPC.ConnectionList',
      'JSONRPC.Introspect',
      'Application.ModuleInfo',
      'Application.SystemInfo',
      'System.IPAddress.Show',
      'Signal.List'
    ];

    // await this.signalSubscribe().subscribe({
    //   next(res) {
    //     console.log('subscribe next: ', res);
    //     this.output = JSON.stringify(res.result);
    //   }
    //   // , error(msg) {
    //   //   console.log('subscribe error: ', msg);
    //   //   this.output = JSON.stringify(msg);
    //   // },
    //   // complete() {
    //   //   console.log('subscribe completed');
    //   //   this.output = JSON.stringify('subscribe completed');
    //   // }
    // });

    // await this.testCall({path: 'A1:Connect', handle: '34'}, 'Signal.Read').then(res => {
    //   console.log('signal:', res.result);
    // });


    // await this.getGraph(params).then(root => {
    //   console.log('getGraph', root);
    // });

    // await this.formattedAllSignals().then(res => {
    //   console.log('readAllSignals', res);
    // });

    // this.loopSignalCheck(1000 * 5, 5);
    // const body = JSON.stringify({ 'jsonrpc': '2.0', 'id': 1, 'method': 'Signal.Subscribe', 'params': {
    //   'path': 'Board:MemUsage'
    // }});
    // this.http.post<JsonrpcResponse>(this.url, body).subscribe({
    //   next(res) {
    //       console.log('subscribe next: ', res);
    //       this.output = JSON.stringify(res.result);
    //     }
    //   });


    // for (let i = 0; i < methods.length; i++) {
    //   await this.testCall(params, methods[i]).then(res => {
    //     console.log(methods[i], res.result);
    //   });
    // }

    // console.log('test using testCall:', await this.testCall({ 'Device': 'A1' }, methods[1]));
    console.log('test using testSocket:', await this.testSocket({'path': 'A1:Connect'}, 'Signal.Subscribe'));

    if (outputs.length > 0) {
      result = outputs.join('-------------------------');
    }
    return result;
  }

  public signalSubscribe(): Observable<JsonrpcResponse> {
    const body = JSON.stringify({
      'jsonrpc': '2.0', 'id': 1, 'method': 'Signal.Subscribe', 'params': {
        'path': 'A1:Connect'
        ,
        'enable': false,
        'peek': false
      }
    });
    return this.http.post<JsonrpcResponse>(this.url, body);
  }


  public async testSocket(params: object, method: string) {

    const ws = new WebSocket(this.wsUrl);

    ws.on('open', async () => {
      // call an RPC method with parameters
      const subRes = await ws.call('Signal.Subscribe', { 'path': 'A1:OnTime' });
      console.log('WS sub response: ', subRes);
      const subDetRes = await ws.call('Signal.Subscription', { 'rate': 1000 * 5 });
      console.log('WS sub details response: ', subDetRes);

      // subscribe to receive an event
      ws.subscribe('Signal.OnUpdate') // this sends a request to the server. server responds with error. this step is necessary
      .catch(error => {
        // ignore error
      });

      // when the CTM server sends back a response with method 'Signal.OnUpdate', do callback
      ws.on('Signal.OnUpdate', res => {
        // updateLogic();
        console.log({handle: res[0][0], newValue: res[0][1]});
      });
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

    const signalList = await this.getSignalList();

    for (let i = 0; i < signalList.result.length; i++) {
      const signal = signalList.result[i];
      const signalPath = signal['path'];
      let signalVal;
      const val = await this.readSignal({ 'path': signalPath });
      signalVal = val.result['Value'];
      // signalArray.push({'path' : signal['path'], 'value': signalVal});
      signalArray.push(new Signal(signal['path'], signalVal));
      this.signals.push(new Signal(signal['path'], signalVal));
    }
    return signalArray;
  }

  public getSignalList(): Promise<JsonrpcResponse> {
    const body = JSON.stringify({ 'jsonrpc': '2.0', 'method': 'Signal.List', 'id': 1 });
    const httpOptions = { // post request works without (when using chrome extension). adding httpOptions to post request breaks request.
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.post<JsonrpcResponse>(this.url, body).toPromise();
  }
  public readSignal(params: Object): Promise<JsonrpcResponse> {
    const body = JSON.stringify({ 'jsonrpc': '2.0', 'method': 'Signal.Read', 'params': params, 'id': 1 });
    const httpOptions = { // post request works without (when using chrome extension). adding httpOptions to post request breaks request.
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.post<JsonrpcResponse>(this.url, body).toPromise();
  }

  public getGraphNodeChildren(params: Object): Promise<JsonrpcResponse> {
    const body = JSON.stringify({ 'jsonrpc': '2.0', 'method': 'IPS.Device.Connections', 'params': params, 'id': 1 });
    const httpOptions = { // post request works without (when using chrome extension). adding httpOptions to post request breaks request.
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
    return this.http.post<JsonrpcResponse>(this.url, body).toPromise();
  }

  public async getGraph(params: Object): Promise<GraphNode> {
    const node = new GraphNode([params['Device']], 'sensor', '', null);
    const children = await this.getGraphNodeChildren(params);
    // console.log(params);
    // console.log('children:', children);
    for (let i = 0; i < children.result.length; i++) {
      let childName;
      const child = children.result[i];
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

  public async getGraphString(size: number): Promise<string> {
    this.nodeArr = new Array<GraphNode>();
    await this.getGraph({ 'Device': 'A1' });
    await this.readAllSignals();
    const resStr = this.formatter.formatGraphString(size, this.nodeArr);
    console.log(resStr);
    return resStr;
  }

  private getTestData(): Array<GraphNode> {

    /**------------- CREATING ARRAY ------------ */

    const nodes: Array<GraphNode> = [
      // ------------- Layer 1
      new GraphNode(['can1mac9', 'ACU'], 'sensor', '', null), // 0
      // ------------- Layer 2
      new GraphNode(['can1mac9', 'ACU', 'V1'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'PS1'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'DPS1'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'V2'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'PS2'], 'sensor', '', null), // 5
      new GraphNode(['can1mac9', 'ACU', 'DPS2'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'V3'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'PS3'], 'sensor', '', null),
      // ------------- Layer 3
      new GraphNode(['can1mac9', 'ACU', 'IP1'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'FS1'], 'sensor', '', null), // 10
      new GraphNode(['can1mac9', 'ACU', 'IP2'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'FS2'], 'sensor', '', null),
      new GraphNode(['can1mac9', 'ACU', 'IP3'], 'sensor', '', null),
      // ------------- Layer 4
      new GraphNode(['A1Shape2IP'], 'sensor', '', null),
      new GraphNode(['A1Shape2FS'], 'sensor', '', null), // 15
      new GraphNode(['A1Shape1IP'], 'sensor', '', null),
      new GraphNode(['A1Shape1FS'], 'sensor', '', null),
      new GraphNode(['A1AtomRS'], 'sensor', '', null),
      // ------------- Layer 5
      new GraphNode(['A1AirSupPSIn'], 'sensor', '', null),
      new GraphNode(['A1Shape2'], 'sensor', '', null), // 20
      new GraphNode(['A1Shape1'], 'sensor', '', null),
      new GraphNode(['A1BellRotating'], 'alarm', '', null),
      new GraphNode(['A1AtomFluidLim'], 'alarm', '', null),
      new GraphNode(['A1AtomRegEn'], 'sensor', '', null),
      new GraphNode(['A1ShaftLock'], 'sensor', '', null), // 25
      // ------------- Layer 6
      new GraphNode(['A1AirSupPS'], 'sensor', '', null),
      new GraphNode(['A1Shape2Dev'], 'alarm', '', null),
      new GraphNode(['A1Shape1Dev'], 'alarm', '', null),
      new GraphNode(['A1ShaftSpeedLim'], 'alarm', '', null),
      new GraphNode(['A1AtomRegOffLim'], 'alarm', '', null), // 30
      new GraphNode(['A1ShaftLockOnLim'], 'alarm', '', null),
    ];

    /**------------- POPULATING LINK ARRAY ------------ */


    // ------------- Layer 1
    nodes[0].connectsTo = new Array<Link>(
      new Link(nodes[2], 'Input'), new Link(nodes[3], 'Input'), new Link(nodes[5], 'Input'),
      new Link(nodes[6], 'Input'), new Link(nodes[8], 'Input')
    );
    // ------------- Layer 2
    nodes[1].connectsTo = new Array<Link>(new Link(nodes[0], 'Output'));
    nodes[2].connectsTo = new Array<Link>(new Link(nodes[9], 'Actual'), new Link(nodes[10], 'Press'));
    nodes[3].connectsTo = new Array<Link>(new Link(nodes[10], 'Delta'));
    nodes[4].connectsTo = new Array<Link>(new Link(nodes[0], 'Output'));
    nodes[5].connectsTo = new Array<Link>(new Link(nodes[11], 'Actual'), new Link(nodes[12], 'Press'));
    nodes[6].connectsTo = new Array<Link>(new Link(nodes[12], 'Delta'));
    nodes[7].connectsTo = new Array<Link>(new Link(nodes[0], 'Output'));
    nodes[8].connectsTo = new Array<Link>(new Link(nodes[13], 'Actual'));
    // ------------- Layer 3
    nodes[9].connectsTo = new Array<Link>(new Link(nodes[1], 'Valve'));
    nodes[10].connectsTo = new Array<Link>(new Link(nodes[15], 'Input'));
    nodes[11].connectsTo = new Array<Link>(new Link(nodes[4], 'Valve'));
    nodes[12].connectsTo = new Array<Link>(new Link(nodes[17], 'Input'));
    nodes[13].connectsTo = new Array<Link>(new Link(nodes[7], 'Valve'));
    // ------------- Layer 4
    nodes[14].connectsTo = new Array<Link>(new Link(nodes[9], 'Output'));
    nodes[15].connectsTo = new Array<Link>(new Link(nodes[20], 'Actual'));
    nodes[16].connectsTo = new Array<Link>(new Link(nodes[11], 'Output'));
    nodes[17].connectsTo = new Array<Link>(new Link(nodes[21], 'Actual'));
    nodes[18].connectsTo = new Array<Link>(new Link(nodes[22], 'Target'), new Link(nodes[23], 'Target'), new Link(nodes[29], 'Target'));
    // ------------- Layer 5
    nodes[19].connectsTo = new Array<Link>(new Link(nodes[26], 'Input'));
    nodes[20].connectsTo = new Array<Link>(new Link(nodes[15], 'Output'), new Link(nodes[27], 'Target'));
    nodes[21].connectsTo = new Array<Link>(new Link(nodes[16], 'Output'), new Link(nodes[28], 'Target'));
    // nodes[22].connectsTo = ;
    // nodes[23].connectsTo = ;
    nodes[24].connectsTo = new Array<Link>(new Link(nodes[30], 'Target'));
    nodes[25].connectsTo = new Array<Link>(new Link(nodes[31], 'Target'));
    // ------------- Layer 6
    // nodes[26].connectsTo = ;
    // nodes[27].connectsTo = ;
    // nodes[28].connectsTo = ;
    nodes[29].connectsTo = new Array<Link>(new Link(nodes[25], 'Notify'));
    nodes[30].connectsTo = new Array<Link>(new Link(nodes[25], 'Notify'));
    // nodes[31].connectsTo = ;
    return nodes;
  }
}
