/* EMM😭 browser VM: consumes the compiler's shared IR, not hand-written game rules. */
(function (global) {
  'use strict';
  class Fault extends Error { constructor(value, loc) { super(String(value)); this.value=value; this.loc=loc; } }
  class Flow { constructor(kind, value=null) { this.kind=kind; this.value=value; } }
  class Scope {
    constructor(parent=null) { this.parent=parent; this.values=new Map(); }
    define(name,value,constant=false) { if(this.values.has(name)) throw new Error('Already declared: '+name); this.values.set(name,{value,constant}); }
    get(name) { if(this.values.has(name))return this.values.get(name).value; if(this.parent)return this.parent.get(name);throw new Error('Undefined name: '+name); }
    set(name,value) { if(this.values.has(name)){let item=this.values.get(name);if(item.constant)throw new Error('Cannot assign constant: '+name);item.value=value;return;}if(this.parent)return this.parent.set(name,value);throw new Error('Assignment needs a declaration: '+name); }
  }
  const integer=x=>{if(typeof x!=='bigint')throw new Error('Expected an integer');return x;};
  const number=x=>{if(typeof x!=='number'&&typeof x!=='bigint')throw new Error('Expected a number');return Number(x);};
  const bool=x=>{if(typeof x!=='boolean')throw new Error('Conditions require a boolean');return x;};
  const string=x=>{if(typeof x!=='string')throw new Error('Expected a string');return x;};
  const numeric=x=>typeof x==='bigint'||typeof x==='number';
  const checked=x=>{if(typeof x==='bigint'&&(x<-(1n<<63n)||x>=(1n<<63n)))throw new Error('Integer overflow');if(typeof x==='number'&&!Number.isFinite(x))throw new Error('Non-finite arithmetic result');return x;};
  const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  function show(x,seen=new Set()) {
    if(x===null)return '..';if(typeof x==='boolean')return x?'++':'--';if(typeof x==='function')return '<function>';if(typeof x!=='object')return String(x);
    if(seen.has(x))return '<cycle>';seen=new Set(seen);seen.add(x);
    if(Array.isArray(x))return '['+x.map(v=>show(v,seen)).join(', ')+']';
    return '{'+Object.keys(x).sort().map(k=>k+': '+show(x[k],seen)).join(', ')+'}';
  }
  function compare(op,a,b) {
    if(op==='==')return a===b||(numeric(a)&&numeric(b)&&a==b);
    if(op==='!=')return !compare('==',a,b);
    if((typeof a==='string'&&typeof b==='string')||(numeric(a)&&numeric(b))){if(op==='<')return a<b;if(op==='>')return a>b;if(op==='<=')return a<=b;if(op==='>=')return a>=b;}
    throw new Error('Comparison requires numbers or two strings');
  }
  function binary(op,a,b) {
    if(['==','!=','<','>','<=','>='].includes(op))return compare(op,a,b);
    if(op==='+'&&typeof a==='string'&&typeof b==='string')return a+b;
    if(op==='+'&&Array.isArray(a)&&Array.isArray(b))return [...a,...b];
    number(a);number(b);
    if(op==='/'){if(number(b)===0)throw new Error('Division by zero');return checked(number(a)/number(b));}
    if(op==='%'){integer(a);integer(b);if(b===0n)throw new Error('Modulo by zero');return a%b;}
    if(typeof a!==typeof b){a=Number(a);b=Number(b);}
    return checked(op==='+'?a+b:op==='-'?a-b:a*b);
  }
  class VM {
    constructor(modules={},options={}) {
      this.modules=modules;this.cache=new Map();this.root=new Scope();this.scope=new Scope(this.root);this.limit=options.limit||300000;this.steps=0;this.depth=0;this.loc=[];this.output=options.output||(()=>{});this.input=options.input||(()=> '');this.random=options.random||Math.random;this.install();
    }
    tick(loc) {this.loc=loc||this.loc;if(++this.steps>this.limit)throw new Fault('Browser instruction budget exceeded; reduce loop size',this.loc);}
    resetBudget() {this.steps=0;}
    builtin(name,count,fn) {this.root.define(name,(...a)=>{if(a.length!==count)throw new Error(`Expected ${count} arguments, got ${a.length}`);return fn(...a);},true);}
    install() {
      const add=(i,n,f)=>this.builtin('$'+i,n,f),items=x=>{if(Array.isArray(x))return [...x];if(typeof x==='string')return Array.from(x);throw new Error('Expected an array or string');};
      add(0,2,(lo,hi)=>{integer(lo);integer(hi);if(lo>hi)throw new Error('Invalid random bounds');if(hi-lo>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Browser random range too wide');return lo+BigInt(Math.floor(this.random()*Number(hi-lo+1n)));});
      add(1,1,x=>BigInt(Array.isArray(x)?x.length:typeof x==='string'?Array.from(x).length:record(x)?Object.keys(x).length:(()=>{throw new Error('Expected a collection');})()));
      add(2,2,(a,b)=>compare('<',a,b)?a:b);add(3,2,(a,b)=>compare('>',a,b)?a:b);add(4,1,show);
      add(5,1,x=>{if(typeof x==='bigint')return x;string(x);if(!/^\s*[+-]?\d+$/.test(x))throw new Error('Invalid integer text');return checked(BigInt(x));});
      add(6,1,x=>{if(numeric(x))return checked(Number(x));string(x);if(!/^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(x))throw new Error('Invalid float text');return checked(Number(x));});
      add(7,2,(a,v)=>{if(!Array.isArray(a))throw new Error('Append needs an array');a.push(v);return a;});add(8,1,a=>{if(!Array.isArray(a)||!a.length)throw new Error('Pop needs a nonempty array');return a.pop();});
      add(9,2,(lo,hi)=>{integer(lo);integer(hi);if(hi<lo||hi-lo>1000000n)throw new Error('Invalid or excessive range');let out=[];for(let i=lo;i<hi;i++)out.push(i);return out;});
      add(10,1,a=>items(a).sort((x,y)=>compare('<',x,y)?-1:compare('>',x,y)?1:0));
      add(11,1,a=>{let out=items(a);for(let i=out.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;});
      add(12,3,(a,lo,hi)=>{integer(lo);integer(hi);let xs=items(a);if(lo<0n||hi<lo||hi>BigInt(xs.length))throw new Error('Invalid slice bounds');let out=xs.slice(Number(lo),Number(hi));return typeof a==='string'?out.join(''):out;});
      add(13,1,a=>{if(!record(a))throw new Error('Keys needs a record');return Object.keys(a).sort();});add(14,2,(a,k)=>{if(!record(a))throw new Error('Has needs a record');return Object.hasOwn(a,string(k));});
      add(15,1,x=>{number(x);return checked(x<(typeof x==='bigint'?0n:0)?-x:x);});add(16,1,x=>Math.floor(number(x)));add(17,1,x=>checked(Math.sqrt(number(x))));add(18,2,(x,y)=>checked(number(x)**number(y)));
      for(let i of [19,20,23])add(i,i===20?2:1,()=>{throw new Error('This system operation is available in native programs, not the browser');});
      add(21,0,()=>BigInt(Date.now()));add(22,0,()=>[]);add(24,1,x=>{if(!bool(x))throw new Error('Assertion failed');return null;});
      add(25,1,x=>x===null?'null':typeof x==='bigint'?'integer':typeof x==='number'?'float':typeof x==='boolean'?'boolean':typeof x==='string'?'string':typeof x==='function'?'function':Array.isArray(x)?'array':'record');
      add(26,1,x=>{let state=Number(BigInt.asUintN(32,integer(x)));this.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};return null;});
      add(27,2,(a,f)=>items(a).map(x=>this.invoke(f,[x])));add(28,2,(a,f)=>items(a).filter(x=>bool(this.invoke(f,[x]))));add(29,3,(a,f,v)=>items(a).reduce((acc,x)=>this.invoke(f,[acc,x]),v));
      add(30,2,(s,sep)=>{string(s);string(sep);if(!sep)throw new Error('Split separator cannot be empty');return s.split(sep);});add(31,2,(a,sep)=>items(a).map(string).join(string(sep)));
      add(32,2,(a,f)=>items(a).sort((x,y)=>bool(this.invoke(f,[x,y]))?-1:bool(this.invoke(f,[y,x]))?1:0));
    }
    access(obj,key) {
      if(Array.isArray(obj)||typeof obj==='string'){integer(key);let xs=typeof obj==='string'?Array.from(obj):obj;if(key<0n||key>=BigInt(xs.length))throw new Error('Index out of bounds');return xs[Number(key)];}
      if(!record(obj))throw new Error('Property access needs a record');string(key);if(!Object.hasOwn(obj,key))throw new Error('Unknown field: '+key);return obj[key];
    }
    assign(obj,key,value) {if(Array.isArray(obj)){integer(key);if(key<0n||key>=BigInt(obj.length))throw new Error('Index out of bounds');obj[Number(key)]=value;}else{if(!record(obj))throw new Error('Assignment needs an array or record');obj[string(key)]=value;}}
    expr(n,e) {
      this.tick(n.loc);
      switch(n.tag) {
        case 'literal':return n.integerText!==undefined?checked(BigInt(n.integerText)):n.value;
        case 'id':return e.get(n.name);
        case 'array':return n.values.map(x=>this.expr(x,e));
        case 'object':return Object.assign(Object.create(null),Object.fromEntries(n.fields.map(([k,v])=>[k,this.expr(v,e)])));
        case 'field':return this.access(this.expr(n.value,e),n.name);
        case 'index':return this.access(this.expr(n.value,e),this.expr(n.index,e));
        case 'unary':{if(n.op==='-'&&n.value.integerText==='9223372036854775808')return -(1n<<63n);let v=this.expr(n.value,e);if(n.op==='not')return !bool(v);number(v);return n.op==='+'?v:checked(-v);}
        case 'binary':{let a=this.expr(n.left,e);if(n.op==='and')return bool(a)&&bool(this.expr(n.right,e));if(n.op==='or')return bool(a)||bool(this.expr(n.right,e));return binary(n.op,a,this.expr(n.right,e));}
        case 'invoke':return this.invoke(this.expr(n.value,e),n.args.map(x=>this.expr(x,e)));
        default:throw new Error('Unknown IR expression '+n.tag);
      }
    }
    invoke(fn,args) {if(typeof fn!=='function')throw new Error('Attempted to call a non-function');if(++this.depth>150){this.depth--;throw new Error('Browser recursion limit exceeded');}try{return fn(...args);}finally{this.depth--;}}
    body(body,e){for(let n of body)this.stmt(n,e);}
    stmt(n,e) {
      this.tick(n.loc);
      try {
        switch(n.tag) {
          case 'var':case 'const':e.define(n.name,this.expr(n.value,e),n.tag==='const');break;
          case 'set':{let t=n.target;if(t.tag==='id')e.set(t.name,this.expr(n.value,e));else{let obj=this.expr(t.value,e),key=t.tag==='field'?t.name:this.expr(t.index,e);this.assign(obj,key,this.expr(n.value,e));}break;}
          case 'expr':this.expr(n.value,e);break;
          case 'print':this.output(show(this.expr(n.value,e)));break;
          case 'input':e.set(n.target,String(this.input()));break;
          case 'return':throw new Flow('return',this.expr(n.value,e));
          case 'throw':throw new Fault(this.expr(n.value,e),n.loc);
          case 'exit':throw new Flow('exit',integer(this.expr(n.value,e)));
          case 'break':case 'continue':throw new Flow(n.tag);
          case 'if':{let found=false;for(let [condition,body] of n.branches)if(bool(this.expr(condition,e))){this.body(body,new Scope(e));found=true;break;}if(!found)this.body(n.other,new Scope(e));break;}
          case 'while':while(bool(this.expr(n.value,e))){try{this.body(n.body,new Scope(e));}catch(x){if(x instanceof Flow&&x.kind==='break')break;if(!(x instanceof Flow&&x.kind==='continue'))throw x;}}break;
          case 'for':{let xs=this.expr(n.value,e);if(!Array.isArray(xs)&&typeof xs!=='string')throw new Error('For needs an array or string');for(let value of Array.from(xs)){let local=new Scope(e);local.define(n.name,value);try{this.body(n.body,local);}catch(x){if(x instanceof Flow&&x.kind==='break')break;if(!(x instanceof Flow&&x.kind==='continue'))throw x;}}break;}
          case 'fn':e.define(n.name,(...a)=>{if(a.length!==n.params.length)throw new Error('Wrong function arity');let local=new Scope(e);n.params.forEach((p,i)=>local.define(p,a[i]));try{this.body(n.body,local);}catch(x){if(x instanceof Flow&&x.kind==='return')return x.value;throw x;}return null;},true);break;
          case 'try':try{this.body(n.body,new Scope(e));}catch(x){if(x instanceof Flow)throw x;let local=new Scope(e);local.define(n.name,x instanceof Fault?x.value:String(x.message));this.body(n.other,local);}break;
          case 'import':{let parts=(n.loc[0].split('/').slice(0,-1).join('/')+'/'+n.path).split('/'),path=[];for(let p of parts)if(p==='..')path.pop();else if(p&&p!=='.')path.push(p);let key=path.join('/');if(!this.modules[key])throw new Error('Missing bundled module: '+key);if(!this.cache.has(key)){let local=new Scope(this.root);this.body(this.modules[key],local);this.cache.set(key,Object.assign(Object.create(null),Object.fromEntries([...local.values].map(([k,v])=>[k,v.value]))));}e.define(n.name,this.cache.get(key),true);break;}
          default:throw new Error('Unknown IR statement '+n.tag);
        }
      }catch(x){if(x instanceof Flow||x instanceof Fault)throw x;throw new Fault(String(x.message||x),this.loc);}
    }
    load(ir) {this.resetBudget();try{this.body(ir,this.scope);}catch(x){if(x instanceof Flow&&x.kind==='exit')return x.value;throw x;}return this;}
    call(name,...args) {this.resetBudget();try{return this.invoke(this.scope.get(name),args);}catch(x){if(x instanceof Flow||x instanceof Fault)throw x;throw new Fault(String(x.message||x),this.loc);}}
  }
  global.EMM={VM,Fault,Flow,show,binary};
  if(typeof module!=='undefined')module.exports=global.EMM;
})(globalThis);
