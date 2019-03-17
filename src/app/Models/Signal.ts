export class Signal {
    public nodeName: string;
    public valueName: string;
    public value: number;
    public unit: string;
    public handle: number;

    constructor(path: string, value: number, unit: string) {
        this.nodeName = path.split(':')[0];
        this.valueName = path.split(':')[1];
        this.value = value;
        this.unit = unit;
    }
}
