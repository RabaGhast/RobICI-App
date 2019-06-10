import { Link } from './Link';

export class GraphNode {
    public name: Array<string>;
    public type: string;
    public status: string;
    public outEdges: Array<Link>;

    /**
     * Returns string representing all nodes this node is connecting to.
     * example return value: 'node1->node2,node3,node4;'
     */
    public connectionStr(): string {
        if (this.outEdges == null) { return ''; }
        /* OLD solution:
        let res = `${this.name.join('')}->`;
        this.connectsTo.forEach(link => {
            res += `${link.to.name.join('')},`;
        });
        res = res.substring(0, res.length - 1) + ';'; // replace last comma with semi-colon
        return res;
        */
        return this.outEdges.map(l => this.name.join('') + '->' + l.to.name.join('') + '[label=' + l.label + '];\n').join('');
    }

    constructor(name: Array<string>, type: string, status: string, outEdges: Array<Link>) {
        this.name = name;
        this.type = type;
        this.status = status;
        this.outEdges = outEdges;
    }
}
