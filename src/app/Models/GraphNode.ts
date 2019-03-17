import { Link } from './Link';

export class GraphNode {
    public name: Array<string>;
    public type: string;
    public status: string;
    public connectsTo: Array<Link>;

    /**
     * Returns string representing all nodes this node is connecting to.
     * example return value: 'node1->node2,node3,node4;'
     */
    public connectionStr(): string {
        if (this.connectsTo == null) { return ''; }
        let res = `${this.name.join('')}->`;
        this.connectsTo.forEach(link => {
            res += `${link.to.name.join('')},`;
        });
        res = res.substring(0, res.length - 1) + ';'; // replace last comma with semi-colon
        return res;
    }

    constructor(name: Array<string>, type: string, status: string, connectsTo: Array<Link>) {
        this.name = name;
        this.type = type;
        this.status = status;
        this.connectsTo = connectsTo;
    }
}
