"use strict";

class CameraController {
  constructor(app){
    this.app = app;
    this.drag = false;
    this.lx = 0;
    this.ly = 0;
    this.moved = false;
  }

  bind(){
    const fg = this.app.fgC;
    if(!fg) return;

    fg.addEventListener('mousedown', this._onMouseDown.bind(this));
    fg.addEventListener('mousemove', this._onMouseMove.bind(this));
    fg.addEventListener('mouseup', this._onMouseUp.bind(this));
    fg.addEventListener('mouseleave', this._onMouseLeave.bind(this));
    fg.addEventListener('wheel', this._onWheel.bind(this), {passive:false});
    window.addEventListener('mouseup', this._onWindowMouseUp.bind(this));
  }

  _onMouseDown(e){
    this.drag=true;
    this.moved=false;
    this.lx=e.clientX;
    this.ly=e.clientY;
  }

  _onMouseMove(e){
    if(!this.app.city) return;
    if(this.drag){
      const dx=e.clientX-this.lx;
      const dy=e.clientY-this.ly;
      this.app.cam.tx -= dx/this.app.cam.tz;
      this.app.cam.ty -= dy/this.app.cam.tz;
      this.app._clampCamera();
      if(Math.hypot(dx,dy)>2) this.moved=true;
      this.lx=e.clientX;
      this.ly=e.clientY;
    }

    const pt=this.app.renderer.screenToWorld(e.clientX,e.clientY,this.app.cam,this.app.fgC);
    const mx=pt.x;
    const my=pt.y;
    let near=null;
    let md=42/this.app.cam.tz;
    for(const n of this.app.city.graph.nodes.values()){
      if(this.app.roadNav && this.app._roadClearance(n.x,n.y)<2) continue;
      const d=Math.hypot(n.x-mx,n.y-my);
      if(d<md){md=d;near=n.id;}
    }
    this.app.cam.hoverId=near;
  }

  _onMouseUp(){
    this.drag=false;
    this.app._clampCamera();
    if(this.moved){
      this.moved=false;
      return;
    }
    if(this.app.manualMode && this.app.cam.hoverId){
      if(!this.app.startId){
        this.app.startId=this.app.cam.hoverId;
        this.app.msg('Titik A dipilih. Pilih tujuan B.');
      }else if(!this.app.endId && this.app.cam.hoverId!==this.app.startId){
        this.app.endId=this.app.cam.hoverId;
        this.app.manualMode=false;
        this.app.msg('Titik lengkap. Klik Cari Rute.');
      }
    }
  }

  _onWindowMouseUp(){
    this.drag=false;
    this.app._clampCamera();
  }

  _onMouseLeave(){
    this.drag=false;
    this.app._clampCamera();
  }

  _onWheel(e){
    e.preventDefault();
    this.app._zoomBy(e.deltaY<0?1.12:0.9);
  }
}
