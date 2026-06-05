"use strict";

// Struktur graph: node, edge, dan relasi antar titik jalan.

class Graph {
    constructor(){ this.nodes=new Map(); this.edges=[]; }
    addNode(id,x,y){ const n={id,x,y,adj:[]}; this.nodes.set(id,n); return n; }
    addEdge(a,b,dist){
    const na=this.nodes.get(a), nb=this.nodes.get(b);
    if(!na||!nb) return;
    const d=dist ?? Math.hypot(na.x-nb.x,na.y-nb.y);
    const e={a,b,dist:d}; this.edges.push(e);
    na.adj.push({node:nb,edge:e}); nb.adj.push({node:na,edge:e});
    }
}
