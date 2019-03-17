import { Injectable } from '@angular/core';
import { GraphNode } from './Models/GraphNode';
import { Signal } from './Models/Signal';

@Injectable({
  providedIn: 'root'
})
export class FormatterService {

  lastGraph: string;
  constructor() { }

  public getOptionsString(size: number): string {
    const ratio = (window.innerHeight / window.innerWidth);
    return `ratio="${ratio.toFixed(2)}"\n` + // makes node tree fit best for current screen dimensions
      `size="${size}" \n` + // controls "zoom" level
      `margin="2" \n` + // makes canvas big enough to display all nodes
      `center="true"`;
  }

  /**
  * Gets the declaration string defining the visuals for nodes of the given node type
  */
  public getDeclareString(type: string, nodes: Array<GraphNode>): string {

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

  private getLabelString(signals: Array<Signal>, nodes: Array<GraphNode>): string {
    // return nodes.map(n => this.formatLabelString(n.name[0], signals)).join('');
    return nodes.map(n => this.formatLabelString2(n.name[0])).join('\n');
  }

  private formatLabelString2(nodeName: string): string {
    const result = `${nodeName} [label = <<b>${nodeName}</b><br/>SignalName: ` +
    `SignalValue>, id = "${nodeName}"];`;
    return result;
  }

  private formatLabelString(nodeName: string, signals: Array<Signal>): string {
    let result = '';
    const filteredSignals = signals.filter(s => s.nodeName === nodeName && s.value != null);
    result += `${nodeName} [label = <<b>${nodeName}</b><br/>` +
      filteredSignals.map(s => s.valueName + ':' + s.value).join('<br/>') +
      `>, id = "${nodeName}"];\n`;
    return result;
  }

  /**
   * Gets the connection string for all nodes
   */
  public getConnectionString(nodes: Array<GraphNode>): string {
    let res = '';
    nodes.forEach(node => res += node.connectionStr() + '\n');

    return res;
  }

  public formatGraphString(size: number, nodeArray: Array<GraphNode>, signals: Array<Signal>, refresh: boolean = false): string {

    let str = 'digraph {' + '\n'
    + this.getOptionsString(size) + '\n';

    if (this.lastGraph && !refresh) {
      str += this.lastGraph;
      return str;
    }

    const endStr =
    this.getDeclareString('alarm', nodeArray) + '\n'
    + this.getDeclareString('sensor', nodeArray) + '\n\n'
     + this.getLabelString(signals, nodeArray) + '\n'
    // split and filter for readability. does not affect result:
    + this.getConnectionString(nodeArray).split('\n').filter(l => l.length > 1).join('\n') + '\n'
    + '}';

    console.warn('drawing as new');
    this.lastGraph = endStr;
    return str +  endStr;
  }

  public async formattedAllSignals(signals: Array<Signal>): Promise<Array<any>> {
    const formattedList = new Array<any>();
    const uniqueNames = new Array<String>();

    signals.forEach(signal => {
      if (!(uniqueNames.filter(u => u === signal.nodeName).length > 0)) {
        uniqueNames.push(signal.nodeName);
      }
    });
    uniqueNames.forEach(name => {
      formattedList.push({ name: name, signals: signals.filter(s => s.nodeName === name) });
    });
    return formattedList;
  }
}
