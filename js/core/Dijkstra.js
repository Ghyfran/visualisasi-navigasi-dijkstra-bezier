"use strict";

// Logika pencarian rute terpendek menggunakan algoritma Dijkstra.

class Dijkstra {
    constructor(g){ this.g=g; }
    find(s,e){
    const dist=new Map(), prev=new Map(), vis=new Set();
    const heap=new MinHeap((a,b)=>a.d-b.d);
    for(const id of this.g.nodes.keys()) dist.set(id,Infinity);
    if(!this.g.nodes.has(s) || !this.g.nodes.has(e)){
        return {path:[],visited:vis,steps:[],time:0,totalDist:Infinity};
    }
    dist.set(s,0);
    heap.push({id:s,d:0});
    const t0=performance.now();
    const steps=[];

    while(heap.size){
        const {id,d}=heap.pop();

      // Abaikan antrean lama. Ini membuat Dijkstra stabil ketika ada beberapa
      // kandidat jarak untuk node yang sama.
        if(d > (dist.get(id) ?? Infinity)) continue;
        if(vis.has(id)) continue;

        vis.add(id);
        steps.push({type:'visit',id});
        if(id===e) break;

        const current=this.g.nodes.get(id);
        if(!current || !current.adj) continue;

        for(const {node:nb,edge} of current.adj){
        if(!nb || vis.has(nb.id)) continue;
        const w=Number(edge?.dist);
        if(!Number.isFinite(w) || w<=0) continue;

        const nd=d+w;
        if(nd < (dist.get(nb.id) ?? Infinity)){
            dist.set(nb.id,nd);
            prev.set(nb.id,id);
            heap.push({id:nb.id,d:nd});
            steps.push({type:'queue',id:nb.id});
        }
        }
    }

    const time=performance.now()-t0;
    const path=[];
    if(vis.has(e)){
        let c=e;
        while(c){
        path.unshift(c);
        c=prev.get(c);
        }
    }
    return {path,visited:vis,steps,time,totalDist:dist.get(e)};
    }
}
