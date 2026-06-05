"use strict";

// Struktur data priority queue untuk membantu Dijkstra.

class MinHeap {
    constructor(cmp){ this.data=[]; this.cmp=cmp; }
    get size(){ return this.data.length; }
    push(v){ this.data.push(v); this._up(this.data.length-1); }
    pop(){
    if(!this.data.length) return;
    const top=this.data[0], last=this.data.pop();
    if(this.data.length){ this.data[0]=last; this._down(0); }
    return top;
    }
    _up(i){ while(i>0){ const p=(i-1)>>1; if(this.cmp(this.data[i],this.data[p])<0){[this.data[i],this.data[p]]=[this.data[p],this.data[i]]; i=p;} else break; } }
    _down(i){ const n=this.data.length; while(true){ let m=i,l=2*i+1,r=2*i+2; if(l<n&&this.cmp(this.data[l],this.data[m])<0)m=l; if(r<n&&this.cmp(this.data[r],this.data[m])<0)m=r; if(m===i)break; [this.data[i],this.data[m]]=[this.data[m],this.data[i]]; i=m; } }
}
