import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphNode } from './Models/GraphNode';
import { Link } from './Models/Link';
import { JsonrpcResponse } from './Models/JsonrpcResponse';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  url: string;
  nodeArr: Array<GraphNode>;

  constructor(private http: HttpClient) {
    this.url = 'http://localhost:8090/jsonrpc';
    this.nodeArr = new Array<GraphNode>();
  }

  public getGraphNodeChildren(params: Object): Promise<JsonrpcResponse> {
    const body = JSON.stringify({ 'jsonrpc': '2.0', 'method': 'IPS.Device.Connections', 'params': params, 'id': 1 });
    const httpOptions = { // post request works without (when using chrome extension). adding httpOptions to post request breaks request.
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
      })
    };
    return this.http.post<JsonrpcResponse>(this.url, body).toPromise();
  }

  public async getGraph(params: Object): Promise<GraphNode> {
    const node = new GraphNode([params['Device']], 'sensor', '', null);
    const children = await this.getGraphNodeChildren(params);
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
    const resStr = 'digraph {' + '\n'
      + this.getOptionsString(size) + '\n'
      + this.getDeclareString('alarm', this.nodeArr) + '\n'
      + this.getDeclareString('sensor', this.nodeArr) + '\n\n'
      // split and filter for readability. does not affect result:
      + this.getConnectionString(this.nodeArr).split('\n').filter(l => l.length > 1).join('\n') + '\n'
      + '}';
    console.log(resStr);
    return resStr;
  }

  private getOptionsString(size: number): string {
    const ratio = (window.innerHeight / window.innerWidth);
    return `ratio="${ratio.toFixed(2)}"\n` + // makes node tree fit best for current screen dimensions
      `size="${size}" \n` + // controls "zoom" level
      `margin="2" \n` + // makes canvas big enough to display all nodes
      `center="true"`;
  }

  /**
   * Gets the connection string for all nodes
   */
  private getConnectionString(nodes: Array<GraphNode>): string {
    let res = '';
    nodes.forEach(node => res += node.connectionStr() + '\n');

    return res;
  }

  /**
   * Gets the declaration string defining the visuals for nodes of the given node type
   */
  private getDeclareString(type: string, nodes: Array<GraphNode>): string {

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
    const filteredNodes = nodes.filter(n => n.type === type);
    if (filteredNodes.length <= 0) {
      return '';
    }
    const selectedNodes = filteredNodes.map(n => n.name.join('')).join(';');
    return str + ' ' + selectedNodes + ';';
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
