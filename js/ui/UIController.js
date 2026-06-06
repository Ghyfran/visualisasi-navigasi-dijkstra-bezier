"use strict";

class UIController {
  constructor(app){
    this.app = app;
    this.buttonHandler = new ButtonHandler(app);
    this.cameraController = new CameraController(app);
    this.statusBar = document.getElementById('statusBar');
  }

  init(){
    this.buttonHandler.bind();
    this.cameraController.bind();
    const modalClose = document.getElementById('modalClose');
    if(modalClose){
      modalClose.onclick = ()=>document.getElementById('modal')?.classList.remove('show');
    }
  }

  setMessage(text){
    if(this.statusBar) this.statusBar.innerText = text;
  }
}
