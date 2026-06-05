"use strict";

class VehicleAnimation {
  constructor(app){
    this.app=app;
  }
  get vehicle(){
    return this.app.vehicle;
  }
  get pathHelper(){
    return this.app.vehiclePath;
  }
  routeIsReady(){
    const result=this.app.result;
    const hasPath=result?.path && result.path.length>=2;
    const hasRoutePoints=result?.routePoints && result.routePoints.length>=2;
    return !!(hasPath || hasRoutePoints);
  }
  ensureRoute(){
    if(this.routeIsReady()) return true;
    this.app._optimizeSelectedEndpoints();
    this.app.result=this.app._computeRoute();
    this.app.renderer.t=0;
    this.app._stats();
    return this.routeIsReady();
  }
  startTrack(){
    if(!this.app.startId || !this.app.endId){
      this.app.msg("Pilih titik awal dan titik tujuan dulu.");
      return;
    }
    if(!this.ensureRoute()){
      this.app.msg("Tidak ada rute yang bisa dilalui.");
      return;
    }
    const result=this.app.result;
    const track=this.pathHelper.buildTrack(result.path,result.routePoints);
    const duration=Math.max(4200,track.total*10.5);
    const firstSample=this.pathHelper.sampleTrack(track,0);
    if(this.vehicle instanceof Vehicle){
      this.vehicle.setType("car").setTrack(track,duration,performance.now()).placeAt(firstSample);
    }else{
      this.vehicle.type="car";
      this.vehicle.track=track;
      this.vehicle.progress=0;
      this.vehicle.startTime=performance.now();
      this.vehicle.duration=duration;
      this.vehicle.visible=true;
      Object.assign(this.vehicle,firstSample);
    }
    this.app._stats(true);
    this.app.msg("Start Track dimulai. Mobil mengikuti node rute jalan dari START ke FINISH.");
  }
  updateVehicle(){
    if(!this.vehicle.visible || !this.vehicle.track) return;
    const now=performance.now();
    const rawT=(now-this.vehicle.startTime)/this.vehicle.duration;
    const t=Math.min(1,Math.max(0,rawT));
    const eased=Vehicle.smoothstep(t);
    const sample=this.pathHelper.sampleTrack(this.vehicle.track,eased*this.vehicle.track.total);
    if(sample){
      if(this.vehicle instanceof Vehicle){
        this.vehicle.moveSmoothlyTo(sample,t);
      }else{
        const prevAngle=Number.isFinite(this.vehicle.angle) ? this.vehicle.angle : sample.angle;
        const delta=Math.atan2(Math.sin(sample.angle-prevAngle),Math.cos(sample.angle-prevAngle));
        const hasPrev=Number.isFinite(this.vehicle.x) && Number.isFinite(this.vehicle.y);
        const dist=hasPrev ? Math.hypot(sample.x-this.vehicle.x,sample.y-this.vehicle.y) : Infinity;
        const snap=t<0.02 || t>0.985 || dist>36;
        this.vehicle.x=snap ? sample.x : this.vehicle.x+(sample.x-this.vehicle.x)*0.58;
        this.vehicle.y=snap ? sample.y : this.vehicle.y+(sample.y-this.vehicle.y)*0.58;
        this.vehicle.angle=prevAngle + delta*0.15;
        this.vehicle.progress=t;
      }
    }
    if(t>=1){
      if(this.vehicle instanceof Vehicle) this.vehicle.stop();
      else this.vehicle.visible=false;
      this.app.msg("Animasi track selesai di titik tujuan.");
    }
  }
}
