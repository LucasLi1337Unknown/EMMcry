// EMM😭 native runtime 0.1. Owned arenas release all values and scopes on exit.
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <fstream>
#include <functional>
#include <iostream>
#include <limits>
#include <map>
#include <memory>
#include <random>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

struct Obj;
struct V {
    enum Kind { Null, Int, Float, Bool, String, Array, Object, Function } kind=Null;
    int64_t i=0; double d=0; bool b=false; std::string s; Obj* o=nullptr;
    V()=default;
    explicit V(int64_t x):kind(Int),i(x){}
    explicit V(double x):kind(Float),d(x){}
    explicit V(bool x):kind(Bool),b(x){}
    explicit V(std::string x):kind(String),s(std::move(x)){}
    V(Kind k,Obj* x):kind(k),o(x){}
};
struct Obj {
    std::vector<V> array;
    std::map<std::string,V> fields;
    std::function<V(const std::vector<V>&)> fn;
};
struct Fault {V value; std::string where;};
struct Return {V value;};
struct Break {};
struct Continue {};
struct Exit {int64_t code;};
struct Runtime;
struct Env {
    Runtime* runtime; Env* parent;
    std::map<std::string,std::pair<V,bool>> values;
    Env(Runtime* r,Env* p):runtime(r),parent(p){}
    void define(const std::string& name,V value,bool constant);
    V get(const std::string& name);
    void set(const std::string& name,V value);
};

struct Runtime {
    std::vector<std::unique_ptr<Obj>> objects;
    std::vector<std::unique_ptr<Env>> scopes;
    std::map<std::string,V> modules;
    std::mt19937_64 random{std::random_device{}()};
    std::string location="<runtime>";
    Env* root;
    Runtime(int argc,char** argv);
    [[noreturn]] void fail(const std::string& s){throw Fault{V(s),location};}
    Env* env(Env* parent){scopes.push_back(std::make_unique<Env>(this,parent));return scopes.back().get();}
    Obj* alloc(){objects.push_back(std::make_unique<Obj>());return objects.back().get();}
    V array(std::vector<V> v){Obj* o=alloc();o->array=std::move(v);return V(V::Array,o);}
    V object(std::map<std::string,V> v){Obj* o=alloc();o->fields=std::move(v);return V(V::Object,o);}
    V function(std::function<V(const std::vector<V>&)> f){Obj* o=alloc();o->fn=std::move(f);return V(V::Function,o);}
    void arity(const std::vector<V>& a,size_t n){if(a.size()!=n)fail("Expected "+std::to_string(n)+" arguments, got "+std::to_string(a.size()));}
    bool numeric(V a){return a.kind==V::Int || a.kind==V::Float;}
    double number(V a){if(a.kind==V::Int)return double(a.i);if(a.kind==V::Float)return a.d;fail("Expected a number");}
    int64_t integer(V a){if(a.kind!=V::Int)fail("Expected an integer");return a.i;}
    std::string string(V a){if(a.kind!=V::String)fail("Expected a string");return a.s;}
    bool truth(V a){if(a.kind!=V::Bool)fail("Conditions require a boolean; use an explicit comparison");return a.b;}
    std::vector<std::string> scalars(const std::string& s){
        std::vector<std::string> out;
        for(size_t i=0;i<s.size();){
            unsigned char c=s[i];size_t n=c<128?1:(c<224?2:(c<240?3:4));
            if(c>=128&&(c<194||c>244))fail("Invalid UTF-8 string");
            if(i+n>s.size())fail("Invalid UTF-8 string");
            for(size_t j=1;j<n;j++)if((static_cast<unsigned char>(s[i+j])&192)!=128)fail("Invalid UTF-8 string");
            uint32_t cp=c & (n==1?127:n==2?31:n==3?15:7);
            for(size_t j=1;j<n;j++)cp=(cp<<6)|(static_cast<unsigned char>(s[i+j])&63);
            if((n==2&&cp<128)||(n==3&&cp<2048)||(n==4&&cp<65536)||cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))fail("Invalid UTF-8 string");
            out.push_back(s.substr(i,n));i+=n;
        }
        return out;
    }
    std::string show(V a,std::set<Obj*> seen={}){
        switch(a.kind){
            case V::Null:return "..";
            case V::Int:return std::to_string(a.i);
            case V::Float:{std::ostringstream s;s.precision(15);s<<a.d;return s.str();}
            case V::Bool:return a.b?"++":"--";
            case V::String:return a.s;
            case V::Function:return "<function>";
            default:break;
        }
        if(seen.count(a.o))return "<cycle>";
        seen.insert(a.o);std::string out;
        if(a.kind==V::Array){out="[";for(size_t i=0;i<a.o->array.size();i++){if(i)out+=", ";out+=show(a.o->array[i],seen);}return out+"]";}
        out="{";bool first=true;for(auto& x:a.o->fields){if(!first)out+=", ";first=false;out+=x.first+": "+show(x.second,seen);}return out+"}";
    }
    bool equal(V a,V b){
        if(numeric(a)&&numeric(b)){
            if(a.kind==V::Int&&b.kind==V::Int)return a.i==b.i;
            return static_cast<long double>(a.kind==V::Int?static_cast<long double>(a.i):a.d)==static_cast<long double>(b.kind==V::Int?static_cast<long double>(b.i):b.d);
        }
        if(a.kind!=b.kind)return false;
        switch(a.kind){case V::Null:return true;case V::Bool:return a.b==b.b;case V::String:return a.s==b.s;default:return a.o==b.o;}
    }
    V unary(const std::string& op,V a){
        if(op=="not")return V(!truth(a));
        if(!numeric(a))fail("Unary arithmetic requires a number");
        if(op=="+")return a;
        if(a.kind==V::Int){if(a.i==std::numeric_limits<int64_t>::min())fail("Integer overflow");return V(-a.i);}
        return V(-a.d);
    }
    V binary(const std::string& op,V a,V b){
        if(op=="==")return V(equal(a,b));
        if(op=="!=")return V(!equal(a,b));
        if(op=="+"&&a.kind==V::String&&b.kind==V::String)return V(a.s+b.s);
        if(op=="+"&&a.kind==V::Array&&b.kind==V::Array){auto xs=a.o->array;xs.insert(xs.end(),b.o->array.begin(),b.o->array.end());return array(xs);}
        if(op=="<"||op==">"||op=="<="||op==">="){
            int cmp;
            if(a.kind==V::String&&b.kind==V::String)cmp=a.s==b.s?0:(a.s<b.s?-1:1);
            else{
                number(a);number(b);
                long double x=a.kind==V::Int?static_cast<long double>(a.i):a.d;
                long double y=b.kind==V::Int?static_cast<long double>(b.i):b.d;
                cmp=x==y?0:(x<y?-1:1);
            }
            return V(op=="<"?cmp<0:op==">"?cmp>0:op=="<="?cmp<=0:cmp>=0);
        }
        double x=number(a),y=number(b);
        if(op=="/"){if(y==0)fail("Division by zero");double z=x/y;if(!std::isfinite(z))fail("Non-finite arithmetic result");return V(z);}
        if(op=="%"){
            int64_t ai=integer(a),bi=integer(b);if(bi==0)fail("Modulo by zero");
            if(ai==std::numeric_limits<int64_t>::min()&&bi==-1)return V(int64_t(0));
            return V(ai%bi);
        }
        if(a.kind==V::Int&&b.kind==V::Int){
            int64_t z;bool bad=op=="+"?__builtin_add_overflow(a.i,b.i,&z):op=="-"?__builtin_sub_overflow(a.i,b.i,&z):__builtin_mul_overflow(a.i,b.i,&z);
            if(bad)fail("Integer overflow");return V(z);
        }
        double z=op=="+"?x+y:op=="-"?x-y:x*y;
        if(!std::isfinite(z))fail("Non-finite arithmetic result");return V(z);
    }
    V field(V a,const std::string& key){if(a.kind!=V::Object)fail("Property access requires a record");if(!a.o->fields.count(key))fail("Unknown field: "+key);return a.o->fields[key];}
    void setfield(V a,const std::string& key,V value){if(a.kind!=V::Object)fail("Property assignment requires a record");a.o->fields[key]=value;}
    size_t offset(V index,size_t length){int64_t i=integer(index);if(i<0||uint64_t(i)>=length)fail("Index out of bounds");return size_t(i);}
    V index(V a,V idx){
        if(a.kind==V::Object)return field(a,string(idx));
        if(a.kind==V::Array)return a.o->array[offset(idx,a.o->array.size())];
        if(a.kind==V::String){auto xs=scalars(a.s);return V(xs[offset(idx,xs.size())]);}
        fail("Indexing requires an array, string, or record");
    }
    void setindex(V a,V idx,V value){if(a.kind==V::Object){setfield(a,string(idx),value);return;}if(a.kind!=V::Array)fail("Index assignment requires an array or record");a.o->array[offset(idx,a.o->array.size())]=value;}
    std::vector<V> items(V a){if(a.kind==V::Array)return a.o->array;if(a.kind==V::String){std::vector<V> xs;for(auto& s:scalars(a.s))xs.push_back(V(s));return xs;}fail("For loop requires an array or string");}
    V call(V f,const std::vector<V>& args){if(f.kind!=V::Function)fail("Attempted to call a non-function");std::string saved=location;V v=f.o->fn(args);location=saved;return v;}
    void builtin(const std::string& name,std::function<V(const std::vector<V>&)> f){root->define(name,function(f),true);}
};
void Env::define(const std::string& name,V value,bool constant){if(values.count(name))runtime->fail("Already declared in this scope: "+name);values[name]={value,constant};}
V Env::get(const std::string& name){if(values.count(name))return values[name].first;if(parent)return parent->get(name);runtime->fail("Undefined name: "+name);}
void Env::set(const std::string& name,V value){if(values.count(name)){if(values[name].second)runtime->fail("Cannot assign constant: "+name);values[name].first=value;return;}if(parent){parent->set(name,value);return;}runtime->fail("Assignment needs a declared variable: "+name);}

Runtime::Runtime(int argc,char** argv){
    root=env(nullptr);
    builtin("$0",[this](auto& a){arity(a,2);int64_t lo=integer(a[0]),hi=integer(a[1]);if(lo>hi)fail("Random bounds must be ordered");return V(std::uniform_int_distribution<int64_t>(lo,hi)(random));});
    builtin("$1",[this](auto& a){arity(a,1);V x=a[0];if(x.kind==V::Array)return V(int64_t(x.o->array.size()));if(x.kind==V::Object)return V(int64_t(x.o->fields.size()));if(x.kind==V::String)return V(int64_t(scalars(x.s).size()));fail("Length requires a collection or string");});
    builtin("$2",[this](auto& a){arity(a,2);return truth(binary("<",a[0],a[1]))?a[0]:a[1];});
    builtin("$3",[this](auto& a){arity(a,2);return truth(binary(">",a[0],a[1]))?a[0]:a[1];});
    builtin("$4",[this](auto& a){arity(a,1);return V(show(a[0]));});
    builtin("$5",[this](auto& a){arity(a,1);if(a[0].kind==V::Int)return a[0];std::string s=string(a[0]);try{size_t end;int64_t n=std::stoll(s,&end);if(end!=s.size())fail("Invalid integer text");return V(n);}catch(std::exception&){fail("Invalid integer text or out of range");}});
    builtin("$6",[this](auto& a){arity(a,1);if(numeric(a[0]))return V(number(a[0]));std::string s=string(a[0]);try{size_t end;double n=std::stod(s,&end);if(end!=s.size()||!std::isfinite(n))fail("Invalid float text");return V(n);}catch(std::exception&){fail("Invalid float text");}});
    builtin("$7",[this](auto& a){arity(a,2);if(a[0].kind!=V::Array)fail("Append requires an array");a[0].o->array.push_back(a[1]);return a[0];});
    builtin("$8",[this](auto& a){arity(a,1);if(a[0].kind!=V::Array||a[0].o->array.empty())fail("Pop requires a nonempty array");V v=a[0].o->array.back();a[0].o->array.pop_back();return v;});
    builtin("$9",[this](auto& a){arity(a,2);int64_t lo=integer(a[0]),hi=integer(a[1]);if(hi<lo)fail("Range end must be at least its start");if(static_cast<long double>(hi)-lo>1000000)fail("Range exceeds 0.1 materialization limit (1,000,000)");std::vector<V> xs;for(int64_t i=lo;i<hi;i++)xs.push_back(V(i));return array(xs);});
    builtin("$10",[this](auto& a){arity(a,1);auto xs=items(a[0]);std::stable_sort(xs.begin(),xs.end(),[this](V x,V y){return truth(binary("<",x,y));});return array(xs);});
    builtin("$11",[this](auto& a){arity(a,1);auto xs=items(a[0]);std::shuffle(xs.begin(),xs.end(),random);return array(xs);});
    builtin("$12",[this](auto& a){arity(a,3);auto xs=items(a[0]);int64_t lo=integer(a[1]),hi=integer(a[2]);if(lo<0||hi<lo||uint64_t(hi)>xs.size())fail("Invalid slice bounds");std::vector<V> cut(xs.begin()+lo,xs.begin()+hi);if(a[0].kind==V::String){std::string s;for(auto& v:cut)s+=v.s;return V(s);}return array(cut);});
    builtin("$13",[this](auto& a){arity(a,1);if(a[0].kind!=V::Object)fail("Keys requires a record");std::vector<V> xs;for(auto& x:a[0].o->fields)xs.push_back(V(x.first));return array(xs);});
    builtin("$14",[this](auto& a){arity(a,2);if(a[0].kind!=V::Object)fail("Has requires a record");return V(bool(a[0].o->fields.count(string(a[1]))));});
    builtin("$15",[this](auto& a){arity(a,1);V x=a[0];if(x.kind==V::Int){if(x.i==std::numeric_limits<int64_t>::min())fail("Integer overflow");return V(x.i<0?-x.i:x.i);}return V(std::abs(number(x)));});
    builtin("$16",[this](auto& a){arity(a,1);return V(std::floor(number(a[0])));});
    builtin("$17",[this](auto& a){arity(a,1);double x=number(a[0]);if(x<0)fail("Square root requires a nonnegative number");return V(std::sqrt(x));});
    builtin("$18",[this](auto& a){arity(a,2);double x=std::pow(number(a[0]),number(a[1]));if(!std::isfinite(x))fail("Invalid power result");return V(x);});
    builtin("$19",[this](auto& a){arity(a,1);std::ifstream file(string(a[0]),std::ios::binary);if(!file)fail("Unable to read file");std::ostringstream s;s<<file.rdbuf();return V(s.str());});
    builtin("$20",[this](auto& a){arity(a,2);std::ofstream file(string(a[0]),std::ios::binary);if(!file)fail("Unable to write file");file<<string(a[1]);if(!file)fail("File write failed");return V();});
    builtin("$21",[this](auto& a){arity(a,0);return V(int64_t(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count()));});
    std::vector<V> args;for(int i=1;i<argc;i++)args.push_back(V(std::string(argv[i])));V arguments=array(args);
    builtin("$22",[this,arguments](auto& a){arity(a,0);return arguments;});
    builtin("$23",[this](auto& a){arity(a,1);const char* v=std::getenv(string(a[0]).c_str());return v?V(std::string(v)):V();});
    builtin("$24",[this](auto& a){arity(a,1);if(!truth(a[0]))fail("Assertion failed");return V();});
    builtin("$25",[this](auto& a){arity(a,1);static const std::vector<std::string> names={"null","integer","float","boolean","string","array","record","function"};return V(names[a[0].kind]);});
    builtin("$26",[this](auto& a){arity(a,1);random.seed(uint64_t(integer(a[0])));return V();});
    builtin("$27",[this](auto& a){arity(a,2);auto xs=items(a[0]);std::vector<V> result;for(V x:xs)result.push_back(call(a[1],{x}));return array(result);});
    builtin("$28",[this](auto& a){arity(a,2);auto xs=items(a[0]);std::vector<V> result;for(V x:xs)if(truth(call(a[1],{x})))result.push_back(x);return array(result);});
    builtin("$29",[this](auto& a){arity(a,3);V acc=a[2];for(V x:items(a[0]))acc=call(a[1],{acc,x});return acc;});
    builtin("$30",[this](auto& a){arity(a,2);std::string s=string(a[0]),sep=string(a[1]);if(sep.empty())fail("Split separator cannot be empty");std::vector<V> xs;size_t start=0,pos;while((pos=s.find(sep,start))!=std::string::npos){xs.push_back(V(s.substr(start,pos-start)));start=pos+sep.size();}xs.push_back(V(s.substr(start)));return array(xs);});
    builtin("$31",[this](auto& a){arity(a,2);auto xs=items(a[0]);std::string sep=string(a[1]),out;for(size_t i=0;i<xs.size();i++){if(i)out+=sep;out+=string(xs[i]);}return V(out);});
    builtin("$32",[this](auto& a){arity(a,2);auto xs=items(a[0]);V cmp=a[1];if(cmp.kind!=V::Function)fail("Sort comparator must be a function");std::stable_sort(xs.begin(),xs.end(),[this,cmp](V x,V y){return truth(call(cmp,{x,y}));});return array(xs);});
}
