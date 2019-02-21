export class Signal {
    public nodeName: string;
    public valueName: string;
    public value: number;

    constructor(path: string, value: number) {
        this.nodeName = path.split(':')[0];
        this.valueName = path.split(':')[1];
        this.value = value;
    }
}
