import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
// import Client from 'jsonrpc-websocket-client';
// import * as WebSocketSubject from 'rxjs/observable/dom/WebSocketSubject';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { GraphNode } from './Models/GraphNode';
import { Link } from './Models/Link';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  socket: WebSocketSubject<any>;

  graphDataString: String;
  url: '239.255.189.43';
  body: {
    'jsonrpc': '2.0', 'method': 'IPS.Device.Connections',
    'params': { 'Device': 'a1' }, 'id': 1
  }; // might need JSON.stringify on this
  options: {
    url: '239.255.189.43',
    method: 'post',
    headers:
    {
      'content-type': 'application/json-rpc'
    }
    body: {
      'jsonrpc': '2.0', 'method': 'IPS.Device.Connections',
      'params': { 'Device': 'a1' }, 'id': 1
    } // might need JSON.stringify on this
  };

  constructor(private http: HttpClient) {
  }

  public getGraphData(size: number): Observable<string> {
    this.http.post<any>('239.255.189.43', this.body, this.options).subscribe(result => {
      console.log(result);
    });

    const nodes = this.getTestData();
    // const resStr = 'digraph ' + this.stringGraph(tree);
    const resStr = 'digraph {' + '\n'
      + this.getOptionsString(size) + '\n'
      + this.getDeclareString('alarm', nodes) + '\n'
      + this.getDeclareString('sensor', nodes) + '\n\n'
      + this.getConnectionString(nodes) + '\n'
      + '}';
    return of(resStr);
  }

  private getOptionsString(size: number): string {

    return `ratio="${(window.innerHeight / window.innerWidth).toFixed(2)} \n"` + // makes node tree fit best for current screen dimensions
    `size="${size},${size}" \n` + // controls "zoom" level
    `margin="2" \n`; // makes canvas big enough to display all nodes
  }

  /**
   * Gets the connection string for all nodes
   */
  private getConnectionString(nodes: GraphNode[]): string {
    let res = '';
    nodes.forEach(node => res += node.connectionStr() + '\n');

    return res;
  }
  /*
    private stringGraph(tree: object) {
      console.log('running stringGraph');
      let res = '{';
      Object.keys(tree).forEach(parent => {
        res += parent + ' -> ';
        tree[parent].forEach(child => {
          res += child + ', ';
        });
        res = res.substr(0, res.length - 2) + ';';
      });
      res += '}';
      console.log(res);
      return res;
    }
    */

  /**
   * Gets the declaration string defining the visuals for nodes of the given node type
   */
  private getDeclareString(type: string, nodes: GraphNode[]): string {

    let str = 'node ';

    switch (type) {
      case 'alarm': {
        str += '[shape=diamond,style=filled,fillcolor=green,height=2,width=2];';
        break;
      }
      default: {
        str += '[shape=circle,color=lightGreen,fillcolor=white];';
      }
    }
    const selectedNodes = nodes.filter(n => n.type === type).map(n => n.name.join('')).join(';');
    /**
     * ERROR!!! return statement below should join GraphNode names. currently it joins GraphNode Objects!
     * return statement below should gets all nodes of chosen type in a semi-collon separated string
     */
    return str + ' ' + selectedNodes + ';';
  }

  public async testData() {
    /*const url = 'http://239.255.189.43';
    const headers = new Headers();
    headers.append('Content-Type', 'application/json-rpc');

    const params = new URLSearchParams();
    params.append('jsonrpc', '2.0');
    params.append('id', '1');
    params.append('method', 'IPS.Device.Connections');
    params.append( 'params', '{ "Device": "a1" }, "id": 1');

    const options = {headers: headers, params: params};

    this.http.post(url, options)
      .subscribe(response => console.log('DID IT!', response));
    */
    console.log('starting websocket client!');

    this.socket = webSocket('ws://239.255.189.43:10000'); // 239.255.189.43     239.255.189.43:18943     239.255.189.43:34981
    this.socket.subscribe((message) => {
      console.log(message);
    },
      (err) => console.log(err)
    );
    // this.socket.next(JSON.stringify('potato'));


    // const client = new Client('ws://echo.websocket.org');
    // console.log(client.status); // → closed
    // await client.open();
    // console.log(client.status); // → open
    // onsole.log(await client.call('method', [1, 2, 3]));
    // await client.close();
  }

  private getTestData(): GraphNode[] {

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
