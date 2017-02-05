export type Validator = (v: any) => any | undefined;
export type ValidatorChainer = (v: any) => ValidatorChain;

export class ValidatorChain {
  last_chain : [Validator] = <any>[];

  private chain(f: Validator) {
    this.last_chain.push(f);
  }

  private isType(t) {
    return (v) => (typeof v === t ? v : undefined);
  }

  get isNumber() {
    this.chain(this.isType("number"));
    return this;
  }

  get isNumericString() {
    this.chain(this.isType("string"));
    this.chain((v) => (!isNaN(v) ? v : undefined));
    return this;
  }

  get isString() {
    this.chain(this.isType("string"));
    return this;
  }

  get isBool() {
    this.chain(this.isType("boolean"));
    return this;
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
