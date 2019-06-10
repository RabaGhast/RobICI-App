import { Injectable } from '@angular/core';
import { GraphNode } from './Models/GraphNode';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormatterService {

  lastGraph: string;
  constructor() { }

  public formatGraphString(nodeArray: Array<GraphNode>): string {


    // start of the formatted string. contains global configuration.
    let startStr =
`
digraph {
/* ===== Options: ===== */
${this.getOptionsString()}
`;

    // if graph has already been drawn before, load saved version. startStr is not cached since screen size / ratio may have changed.
    if (this.lastGraph) return startStr += this.lastGraph;

    // last part of the string. contains node spesific configuration. 
    let endStr =
`
/* ===== Declarations: ===== */
${this.getDeclareString('alarm', nodeArray)}
${this.getDeclareString('sensor', nodeArray)}

/* ===== Labels: ===== */
${this.getLabelString(nodeArray)}

/* ===== Connections: ===== */
${this.getConnectionString(nodeArray).split('\n').filter(l => l.length > 1).join('\n')}
}
`;

    console.warn('drawing as new');
    // endStr has no reason to change. Should therefore be cached and loaded later.
    this.lastGraph = endStr;
    return startStr + endStr;
  }

  private getOptionsString(): string {
    const ratio = (window.innerHeight / window.innerWidth);
    return `ratio="${ratio.toFixed(2)}"\n` + // makes node tree fit best for current screen dimensions
      `size="${environment.graph_display_settings.size}" \n` + // controls "zoom" level
      `margin="${environment.graph_display_settings.margin}" \n` + // makes canvas big enough to display all nodes
      `center="true"`;
  }

  /**
  * Gets the declaration string defining the visuals for nodes of the given node type
  */
  private getDeclareString(type: string, nodes: Array<GraphNode>): string {

    let str = 'node ';
    let alarmSettings = environment.node_style_settings.alarm;
    let sensorSettings = environment.node_style_settings.sensor;
    switch (type) {
      case 'alarm': {
        str += `[shape=${alarmSettings.shape},height=${alarmSettings.height},width=${alarmSettings.width}];`;
        break;
      }
      default: {
        str += `[shape=${sensorSettings.shape}];`;
      }
    }
    const filteredNodes = nodes.filter(n => n.type === type);
    if (filteredNodes.length <= 0) {
      return '';
    }
    const selectedNodes = filteredNodes.map(n => n.name.join('')).join(';');
    return str + ' ' + selectedNodes + ';';
  }

  private getLabelString(nodes: Array<GraphNode>): string {
    // return nodes.map(n => this.formatLabelString(n.name[0], signals)).join('');
    return nodes.map(n => this.formatLabelString(n.name[0])).join('\n');
  }

  private formatLabelString(nodeName: string): string {
    const result = `${nodeName} [label = <<b>${nodeName}</b><br/>signalValue>, id = "${nodeName}"];`;
    return result;
  }

  /**
   * Gets the connection string for all nodes
   */
  private getConnectionString(nodes: Array<GraphNode>): string {
    let res = '';
    nodes.forEach(node => res += node.connectionStr() + '\n');

    return res;
  }


}
