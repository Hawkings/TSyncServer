export type Validator = (v: any) => any | undefined;
export type ValidatorChainer = (v: any) => ValidatorChain;

export class ValidatorChain {
  last_chain: [Validator] = <any>[];

  private chain(f: Validator) {
    this.last_chain.push(f);
  }

  isType(t) {
    this.chain((v) => (typeof v === t ? v : undefined));
    return this;
  }

  get isNumber() {
    return this.isType("number");
  }

  get isInteger() {
    this.chain((v) => ((~~v) === v ? v : undefined));
    return this;
  }

  get isNumericString() {
    this.isType("string");
    this.chain((v) => (!isNaN(v) ? v : undefined));
    return this;
  }

  get isString() {
    return this.isType("string");
  }

  get isBoolean() {
    return this.isType("boolean");
  }

  isGreatOrEqual(than: number) {
    this.chain((v) => v >= than ? v : undefined);
    return this;
  }

  isLessOrEqual(than: number) {
    this.chain((v) => v <= than ? v : undefined);
    return this;
  }

  isRegex(r: RegExp) {
    this.chain((v) => {
      return r.test(v) ? v : undefined;
    })
    return this;
  }

  popChain() {
    var x = this.last_chain;
    this.last_chain = <any>[];
    return x;
  }
}

export var Validators = new ValidatorChain();
