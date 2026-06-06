"use strict";

class ButtonHandler {
  constructor(app){
    this.app = app;
  }

  bind(){
    const button = (id, callback) => {
      const element = document.getElementById(id);
      if(element) element.onclick = callback;
    };

    button('btnNewMap', ()=>this.app._useMapVariant(this.app.activeMapIndex+1));
    button('btnRandSE', ()=>this.app._randomRoute());
    button('btnSetPoints', ()=>{
      this.app.startId = null;
      this.app.endId = null;
      this.app.result = null;
      this.app.vehicle.reset();
      this.app.manualMode = true;
      this.app._rst();
      this.app.msg('Klik persimpangan untuk Titik Awal (A).');
    });
    button('btnFit', ()=>this.app._fitCamera());
    button('btnZoomIn', ()=>this.app._zoomBy(1.2));
    button('btnZoomOut', ()=>this.app._zoomBy(1/1.2));
    button('btnReset', ()=>{
      this.app.result = null;
      this.app.vehicle.visible = false;
      this.app.renderer.t = 0;
      this.app._rst();
      this.app.msg('Rute dan animasi dihapus.');
    });
    button('btnRun', ()=>{ console.log('[UI] btnRun clicked'); this.app._runRoute(); });
    button('btnTrack', ()=>{ console.log('[UI] btnTrack clicked'); this.app.vehicleAnimation.startTrack(); });
  }
}
