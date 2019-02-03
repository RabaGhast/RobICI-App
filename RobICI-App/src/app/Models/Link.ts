import { GraphNode } from './GraphNode';

export class Link {
    public to: GraphNode;
    public label: string;
    public type: string;

    constructor(to: GraphNode, label: string){
        this.to = to;
        this.label = label;
    }
}
