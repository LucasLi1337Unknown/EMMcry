#!/usr/bin/env python3
"""EMM😭 0.1: two syntaxes, one IR, a C++17 native backend."""
import argparse
import json
import math
import pathlib
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass

try:
    import regex
except ImportError:
    sys.exit('emmc needs Unicode grapheme support: python3 -m pip install -r requirements.txt')

EMM = {
    '...': 'var', '....': 'const', '!': 'set', '...?': 'input',
    '...!': 'print', '??': 'if', '???': 'elif', '????': 'else',
    '......': 'while', '.....': 'for', '??...': 'fn', '!...': 'return',
    '...??': 'call', '<<': 'import', '!!': 'break', '!?': 'continue',
    '!!!': 'exit', '++': 'true', '--': 'false', '..': 'null',
    '&&': 'and', '||': 'or', '~': 'not', '?:': 'try', '?!!': 'catch',
    '!!?': 'throw',
}
CRY = {
    '🍼': 'var', '🗿': 'const', '✏️': 'set', '👂': 'input', '😭': 'print',
    '🤔': 'if', '🧐': 'elif', '😐': 'else', '🔁': 'while', '🔂': 'for',
    '🧩': 'fn', '↩️': 'return', '📞': 'call', '📥': 'import', '🛑': 'break',
    '⏩': 'continue', '💀': 'exit', '✅': 'true', '❌': 'false', '🕳️': 'null',
    '🫴': '{', '🫷': '}', '➕': '+', '➖': '-', '✖️': '*', '➗': '/',
    '🔢': '%', '🟰🟰': '==', '🚫🟰': '!=', '▶️🟰': '>=', '◀️🟰': '<=',
    '🟰': '=', '▶️': '>', '◀️': '<', '🤝': 'and', '🤷': 'or', '🚫': 'not',
    '🛟': 'try', '🪤': 'catch', '💥': 'throw', '📦': 'array',
}
SYMBOLS = ['==', '!=', '>=', '<=', '+', '-', '*', '/', '%', '=', '>', '<',
           '(', ')', '[', ']', '{', '}', ',', ':', '.', ';']
BUILTINS = {'@random': '$0', '@length': '$1', '@min': '$2', '@max': '$3'}

class Error(Exception):
    def __init__(self, token, message, code='EMM0001'):
        self.token, self.message, self.code = token, message, code
    def __str__(self):
        t = self.token
        return f'{self.code} {t.file}:{t.line}:{t.col}: {self.message} (token {t.raw!r})'

@dataclass
class Token:
    kind: str
    value: object
    raw: str
    file: str
    line: int
    col: int

def lex(source, file, dialect):
    table = dict(EMM if dialect == 'emm' else CRY)
    for symbol in SYMBOLS:
        table[symbol] = symbol
    if dialect == 'cry':
        # Presentation selectors are optional, never split a ZWJ/grapheme.
        for spelling, kind in list(table.items()):
            table.setdefault(spelling.replace('\ufe0f', ''), kind)
    spellings = sorted(table, key=len, reverse=True)
    out, i, line, col = [], 0, 1, 1
    def move(raw):
        nonlocal i, line, col
        i += len(raw)
        if '\n' in raw:
            line += raw.count('\n'); col = len(raw.rsplit('\n', 1)[1]) + 1
        else:
            col += len(raw)
    while i < len(source):
        c = source[i]
        if c.isspace():
            move(c); continue
        if source.startswith('//', i) or (dialect == 'cry' and source.startswith('💬', i)):
            raw = source[i:source.find('\n', i)] if '\n' in source[i:] else source[i:]
            move(raw); continue
        start_line, start_col = line, col
        def emit(kind, value, raw):
            out.append(Token(kind, value, raw, str(file), start_line, start_col)); move(raw)
        if c == '"':
            match = re.match(r'"(?:[^"\\\n]|\\.)*"', source[i:])
            if not match:
                raise Error(Token('string', None, c, str(file), line, col), 'Expected a closed JSON string; escape newlines as \\n')
            raw = match[0]
            try: value = json.loads(raw)
            except ValueError as e: raise Error(Token('string', None, raw, str(file), line, col), str(e))
            try: value.encode('utf-8')
            except UnicodeError:
                raise Error(Token('string', None, raw, str(file), line, col), 'String contains an unpaired Unicode surrogate')
            emit('string', value, raw); continue
        cluster = regex.match(r'\X', source[i:])[0]
        if '\u20e3' in cluster:
            emit('id', cluster, cluster); continue
        match = re.match(r'\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', source[i:])
        if match:
            raw = match[0]; value = float(raw) if any(x in raw for x in '.eE') else int(raw)
            if isinstance(value, float) and not math.isfinite(value):
                raise Error(Token('number', value, raw, str(file), line, col), 'Float literal must be finite')
            emit('number', value, raw); continue
        match = re.match(r'\$\d+|@[A-Za-z]+', source[i:])
        if match:
            raw = match[0]; emit('id', BUILTINS.get(raw, raw), raw); continue
        spelling = next((s for s in spellings if source.startswith(s, i)), None)
        if spelling:
            # A known emoji must be an entire grapheme, not the front of a joined identifier.
            if dialect == 'cry' and ord(spelling[0]) > 127:
                end = i + len(spelling)
                if end < len(source) and (source[end] == '\u200d' or regex.match(r'\p{Emoji_Modifier}', source[end])):
                    spelling = None
            if spelling:
                emit(table[spelling], table[spelling], spelling); continue
        match = regex.match(r'(?:\p{XID_Start}|_)(?:\p{XID_Continue}|_)*', source[i:])
        if match:
            raw = match[0]; emit('id', raw, raw); continue
        cluster = regex.match(r'\X', source[i:])[0]
        if regex.search(r'\p{Extended_Pictographic}|\p{Regional_Indicator}', cluster):
            emit('id', cluster, cluster); continue
        raise Error(Token('invalid', None, cluster, str(file), line, col), 'Unknown token; punctuation order matters')
    out.append(Token('eof', None, '', str(file), line, col))
    return out

PREC = {'or': 1, 'and': 2, '==': 3, '!=': 3, '>': 4, '<': 4, '>=': 4, '<=': 4,
        '+': 5, '-': 5, '*': 6, '/': 6, '%': 6}

class Parser:
    def __init__(self, tokens):
        self.ts, self.i, self.loops, self.functions = tokens, 0, 0, 0
    @property
    def t(self): return self.ts[self.i]
    def take(self, kind=None):
        t = self.t
        if kind and t.kind != kind: raise Error(t, f'Expected {kind}, got {t.kind}')
        self.i += 1; return t
    def accept(self, kind):
        if self.t.kind == kind: return self.take()
        return None
    def node(self, tag, t, **args):
        return dict(tag=tag, loc=[t.file, t.line, t.col], **args)
    def block(self):
        self.take('{'); body = self.program('}'); self.take('}'); return body
    def program(self, end='eof'):
        body = []
        while self.t.kind != end:
            if self.t.kind == 'eof': raise Error(self.t, 'Unclosed block; expected }')
            if self.accept(';'): continue
            body.append(self.statement())
        return body
    def statement(self):
        t = self.take(); k = t.kind
        if k in ('var', 'const'):
            name = self.take('id').value; self.take('=')
            return self.node(k, t, name=name, value=self.expr())
        if k == 'set':
            target = self.expr()
            if target['tag'] not in ('id', 'index', 'field'): raise Error(t, 'Assignment requires a variable, index, or field')
            self.take('='); return self.node(k, t, target=target, value=self.expr())
        if k in ('print', 'exit', 'throw'):
            return self.node(k, t, value=self.expr())
        if k == 'input':
            return self.node(k, t, target=self.take('id').value)
        if k == 'return':
            if not self.functions: raise Error(t, 'Return belongs inside a function')
            value = self.expr() if self.t.kind not in ('}', ';', 'eof') else self.node('literal', t, value=None)
            return self.node(k, t, value=value)
        if k == 'if':
            branches = [(self.expr(), self.block())]
            while self.accept('elif'): branches.append((self.expr(), self.block()))
            other = self.block() if self.accept('else') else []
            return self.node(k, t, branches=branches, other=other)
        if k in ('while', 'for'):
            name = None
            if k == 'for': name = self.take('id').value; self.take(':')
            value = self.expr(); self.loops += 1
            body = self.block(); self.loops -= 1
            return self.node(k, t, name=name, value=value, body=body)
        if k == 'fn':
            name = self.take('id').value; self.take('('); params = []
            if self.t.kind != ')':
                params.append(self.take('id').value)
                while self.accept(','): params.append(self.take('id').value)
            self.take(')')
            if len(params) != len(set(params)): raise Error(t, 'Duplicate parameter')
            old_loops = self.loops; self.loops = 0; self.functions += 1
            body = self.block(); self.functions -= 1; self.loops = old_loops
            return self.node(k, t, name=name, params=params, body=body)
        if k in ('break', 'continue'):
            if not self.loops: raise Error(t, f'{k} belongs inside a loop')
            return self.node(k, t)
        if k == 'import':
            path = self.take('string').value; self.take(':'); name = self.take('id').value
            return self.node(k, t, path=path, name=name)
        if k == 'try':
            body = self.block(); self.take('catch'); name = self.take('id').value; other = self.block()
            return self.node(k, t, body=body, name=name, other=other)
        self.i -= 1
        return self.node('expr', t, value=self.expr())
    def expr(self, minimum=0):
        t = self.take(); k = t.kind
        if k in ('number', 'string'): left = self.node('literal', t, value=t.value)
        elif k in ('true', 'false', 'null'):
            left = self.node('literal', t, value={'true': True, 'false': False, 'null': None}[k])
        elif k == 'id': left = self.node('id', t, name=t.value)
        elif k in ('-', '+', 'not'): left = self.node('unary', t, op=k, value=self.expr(7))
        elif k == '(':
            left = self.expr(); self.take(')')
        elif k in ('[', 'array'):
            if k == 'array': self.take('[')
            values = []
            if self.t.kind != ']':
                values.append(self.expr())
                while self.accept(','):
                    if self.t.kind == ']': break
                    values.append(self.expr())
            self.take(']'); left = self.node('array', t, values=values)
        elif k == '{':
            fields = []
            while self.t.kind != '}':
                key = self.take()
                if key.kind not in ('id', 'string'): raise Error(key, 'Expected record field name or string')
                self.take(':'); fields.append((key.value, self.expr()))
                if not self.accept(','): break
            self.take('}')
            if len(fields) != len({x[0] for x in fields}): raise Error(t, 'Duplicate record field')
            left = self.node('object', t, fields=fields)
        elif k == 'call':
            left = self.expr(8)
            base = left
            while base['tag'] in ('index', 'field'): base = base['value']
            if base['tag'] != 'invoke': raise Error(t, 'Call needs parentheses, for example ...?? add(1, 2)')
        else: raise Error(t, 'Expected an expression')
        while True:
            if self.accept('['):
                index = self.expr(); self.take(']'); left = self.node('index', t, value=left, index=index)
            elif self.accept('.'):
                left = self.node('field', t, value=left, name=self.take('id').value)
            elif self.accept('('):
                args = []
                if self.t.kind != ')':
                    args.append(self.expr())
                    while self.accept(','): args.append(self.expr())
                self.take(')'); left = self.node('invoke', t, value=left, args=args)
            elif self.t.kind in PREC and PREC[self.t.kind] >= minimum:
                op = self.take(); right = self.expr(PREC[op.kind] + 1)
                left = self.node('binary', op, op=op.kind, left=left, right=right)
            else: break
        return left

def parse(source, file, dialect): return Parser(lex(source, file, dialect)).program()
def q(value):
    # Fixed-width octal escapes are valid C++ for every UTF-8 byte, including NUL.
    return '"' + ''.join('\\%03o' % b for b in value.encode('utf-8')) + '"'

class Backend:
    def __init__(self): self.serial = 0; self.modules = {}; self.loading = set()
    def uid(self): self.serial += 1; return f't{self.serial}'
    def expr(self, n):
        t = n['tag']
        if t == 'literal':
            v = n['value']
            if v is None: return 'V()'
            if isinstance(v, bool): return 'V(true)' if v else 'V(false)'
            if isinstance(v, str): return 'V(std::string(' + q(v) + ',' + str(len(v.encode('utf-8'))) + '))'
            if isinstance(v, int):
                if not -(2**63) <= v < 2**63: raise Error(Token('', None, str(v), *n['loc']), 'Integer literal exceeds signed 64-bit range')
                return f'V(int64_t({v}LL))'
            return f'V(double({v!r}))'
        if t == 'id': return f'e->get({q(n["name"])})'
        if t == 'array': return 'r.array({' + ','.join(self.expr(x) for x in n['values']) + '})'
        if t == 'object': return 'r.object({' + ','.join('{std::string('+q(k)+','+str(len(k.encode('utf-8')))+'),'+self.expr(v)+'}' for k,v in n['fields'])+'})'
        if t == 'field': return f'r.field({self.expr(n["value"])},{q(n["name"])})'
        if t == 'index': return f'([&](){{V obj={self.expr(n["value"])};V idx={self.expr(n["index"])};return r.index(obj,idx);}}())'
        if t == 'unary':
            if n['op']=='-' and n['value']['tag']=='literal' and isinstance(n['value']['value'], int) and n['value']['value']==2**63:
                return 'V(int64_t(-9223372036854775807LL - 1LL))'
            return f'r.unary({q(n["op"])},{self.expr(n["value"])})'
        if t == 'binary':
            a,b = self.expr(n['left']), self.expr(n['right'])
            if n['op'] in ('and','or'):
                op = '&&' if n['op']=='and' else '||'
                return f'V(r.truth({a}) {op} r.truth({b}))'
            # Immediately invoked lambda guarantees left-to-right operand evaluation.
            return f'([&](){{V a={a}; V b={b}; return r.binary({q(n["op"])},a,b);}}())'
        if t == 'invoke':
            return f'([&](){{V f={self.expr(n["value"])}; std::vector<V> a={{'+','.join(self.expr(x) for x in n['args'])+'}; return r.call(f,a);}())'
        raise ValueError(t)
    def body(self, body): return '\n'.join(self.stmt(x) for x in body)
    def scope(self, body): return '{auto outer=e;auto e=r.env(outer);\n'+self.body(body)+'\n}'
    def stmt(self, n):
        t = n['tag']; prefix = f'r.location={q(":".join(map(str,n["loc"])))};\n'
        if t in ('var','const'): code=f'e->define({q(n["name"])},{self.expr(n["value"])},{str(t=="const").lower()});'
        elif t == 'set':
            target=n['target']; value=self.expr(n['value']); k=target['tag']
            if k=='id': code=f'e->set({q(target["name"])},{value});'
            elif k=='field': code=f'{{V obj={self.expr(target["value"])}; V val={value}; r.setfield(obj,{q(target["name"])},val);}}'
            else: code=f'{{V obj={self.expr(target["value"])}; V idx={self.expr(target["index"])}; V val={value}; r.setindex(obj,idx,val);}}'
        elif t=='print': code=f'std::cout<<r.show({self.expr(n["value"])})<<"\\n";'
        elif t=='input': code=f'{{std::string s; std::getline(std::cin,s); e->set({q(n["target"])},V(s));}}'
        elif t=='return': code=f'throw Return{{{self.expr(n["value"])}}};'
        elif t=='throw': code=f'throw Fault{{{self.expr(n["value"])},r.location}};'
        elif t=='exit': code=f'throw Exit{{r.integer({self.expr(n["value"])})}};'
        elif t=='expr': code=f'(void)({self.expr(n["value"])});'
        elif t=='break': code='throw Break{};'
        elif t=='continue': code='throw Continue{};'
        elif t=='if':
            code=' '.join(('if' if i==0 else 'else if')+f'(r.truth({self.expr(a)}))'+self.scope(b) for i,(a,b) in enumerate(n['branches']))
            if n['other']: code+='else '+self.scope(n['other'])
        elif t=='while': code=f'while(r.truth({self.expr(n["value"])})){{try{self.scope(n["body"])}catch(Continue&){{continue;}}catch(Break&){{break;}}}}'
        elif t=='for':
            name=self.uid()
            code=f'{{auto {name}=r.items({self.expr(n["value"])}); for(V item:{name}){{try{{auto outer=e;auto e=r.env(outer); e->define({q(n["name"])},item,false); {self.body(n["body"])}}}catch(Continue&){{continue;}}catch(Break&){{break;}}}}}}'
        elif t=='fn':
            params=n['params']; defs=''.join(f'e->define({q(p)},a[{i}],false);' for i,p in enumerate(params))
            code=f'e->define({q(n["name"])},r.function([e,&r](const std::vector<V>& a)->V{{r.arity(a,{len(params)}); e=r.env(e); {defs} try{{{self.body(n["body"])}}}catch(Return& ret){{return ret.value;}}return V();}}),true);'
            # Captured pointer must not be reassigned across calls: separate local parameter scope.
            code=code.replace('[e,&r]', '[parent=e,&r]').replace('e=r.env(e);', 'auto e=r.env(parent);')
        elif t=='try': code='try'+self.scope(n['body'])+f'catch(Fault& f){{auto outer=e;auto e=r.env(outer);e->define({q(n["name"])},f.value,false);'+self.body(n['other'])+'}'
        elif t=='import': code=f'e->define({q(n["name"])},load_{self.module(n)}(r),true);'
        else: raise ValueError(t)
        return prefix+code
    def module(self, n):
        path=(pathlib.Path(n['loc'][0]).parent / n['path']).resolve()
        if path in self.loading: raise Error(Token('',None,n['path'],*n['loc']), 'Cyclic imports are not supported in 0.1', 'EMM0020')
        if path in self.modules: return self.modules[path][0]
        if path.suffix not in ('.emm','.cry'): raise Error(Token('',None,n['path'],*n['loc']), 'Import requires .emm or .cry file')
        try: source=path.read_text(encoding='utf-8')
        except OSError as ex: raise Error(Token('',None,n['path'],*n['loc']),str(ex),'EMM0021')
        name=self.uid(); self.loading.add(path)
        body=self.body(parse(source,path,path.suffix[1:])); self.loading.remove(path)
        self.modules[path]=(name,body)
        return name
    def generate(self, ir):
        body=self.body(ir)
        declarations='\n'.join(f'V load_{name}(Runtime&);' for name,_ in self.modules.values())
        modules='\n'.join(f'V load_{name}(Runtime& r){{if(r.modules.count({q(name)}))return r.modules[{q(name)}]; auto e=r.env(r.root);{code}\n V exports=r.object({{}});for(auto& x:e->values)r.setfield(exports,x.first,x.second.first);r.modules[{q(name)}]=exports;return exports;}}' for name,code in self.modules.values())
        return pathlib.Path(__file__).with_name('runtime.hpp').read_text()+ '\n'+declarations+'\n'+modules+'\nint main(int argc,char** argv){Runtime r(argc,argv);auto e=r.env(r.root);try{\n'+body+'\n}catch(Exit& x){return int(x.code);}catch(Fault& f){std::cerr<<"EMM1001 "<<f.where<<": "<<r.show(f.value)<<"\\n";return 1;}catch(std::exception& x){std::cerr<<"EMM1002 "<<r.location<<": "<<x.what()<<"\\n";return 1;}return 0;}\n'

def translate(source, file, target):
    dialect=pathlib.Path(file).suffix[1:]; tokens=lex(source,file,dialect)
    # Validate syntax before translating. Strings/identifier names are never rewritten.
    Parser(tokens).program()
    table = EMM if target=='emm' else CRY
    reverse={s:s for s in SYMBOLS}
    reverse.update({v:k for k,v in table.items()})
    pieces=[]
    for t in tokens[:-1]:
        if t.kind == 'array' and target == 'emm': continue
        if t.kind == 'id' and target == 'cry' and t.value in CRY:
            raise Error(t, 'Identifier is a reserved token in the target syntax; rename it before translation', 'EMM0030')
        if t.kind in ('id','number','string'): pieces.append(t.raw)
        else: pieces.append(reverse.get(t.kind,t.raw))
    return ' '.join(pieces)+'\n'

def main():
    cli=argparse.ArgumentParser(description='EMM😭 native compiler 0.1')
    cli.add_argument('source',type=pathlib.Path); cli.add_argument('-o','--output',type=pathlib.Path)
    cli.add_argument('--translate',action='store_true')
    cli.add_argument('target',nargs='?',type=pathlib.Path)
    cli.add_argument('--emit-cpp',action='store_true'); cli.add_argument('--emit-ir',action='store_true')
    cli.add_argument('--run',action='store_true'); cli.add_argument('--version',action='version',version='emmc 0.1.0')
    args=cli.parse_args()
    try:
        if args.source.suffix not in ('.emm','.cry'): cli.error('Source extension must be .emm or .cry')
        source=args.source.read_text(encoding='utf-8')
        if args.translate:
            if not args.target or args.target.suffix not in ('.emm','.cry'): cli.error('Use --translate source.emm target.cry (or vice versa)')
            if args.target.resolve()==args.source.resolve(): cli.error('Translation target cannot overwrite source')
            args.target.write_text(translate(source,args.source,args.target.suffix[1:]),encoding='utf-8');return 0
        if args.target: cli.error('A second filename is only valid with --translate')
        ir=parse(source,args.source.resolve(),args.source.suffix[1:])
        output=args.output or args.source.with_suffix('')
        if output.resolve()==args.source.resolve(): cli.error('Output cannot overwrite source')
        if args.emit_ir:
            output.write_text(json.dumps(ir,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); return 0
        cpp=Backend().generate(ir)
        if args.emit_cpp: output.write_text(cpp,encoding='utf-8');return 0
        with tempfile.TemporaryDirectory(prefix='emmc-') as tmp:
            path=pathlib.Path(tmp)/'main.cpp';path.write_text(cpp,encoding='utf-8')
            result=subprocess.run(['c++','-std=c++17','-O2',str(path),'-o',str(output)])
            if result.returncode: return result.returncode
        if args.run: return subprocess.run([str(output.resolve())]).returncode
        return 0
    except (Error,OSError) as ex: print(ex,file=sys.stderr);return 1

if __name__=='__main__': sys.exit(main())
