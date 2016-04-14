(function($, exports){
  exports.ANIMATION_SHOW = 'show';
  
  /*
   * From MDN docs: "a browser may support sessionStorage, but not make it available to the scripts on the page."
   * from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
   */
  function storageAvailable() {
    try {
      var storage = window['sessionStorage'],
      x = '__storage_test__';
      
      storage.setItem(x, x);
      storage.removeItem(x);
      
      return true;
    }
    catch(e) {
      return false;
    }
  }
  
  exports.instance = function(opts){
    var $canvas = opts.$canvas;
    
    this.swatchSize = 20;
    this.swatchPadding = 8;
    
    this.brushSpacing = 25;
    this.brushColor = '#fff';
    this.touches = {};
    
    this.pageNo = 0;
    this.origPage = {}; // the size and position of the page image, after initial scaling
    this.page = {}; // the current size and position of the scaled page image
    
    this.brushImg = new Image();
    this.pageImg = new Image();
    
    // - Size & setup drawing environment ---
    this.canvas = $canvas.get(0);
    this.ctx = this.canvas.getContext('2d');
    
    this.brush = document.createElement('canvas');
    this.brushCtx = null;
    
    // ---
    
    this.canvasAspect = opts.aspectRatio || 1;
    this.sizeCanvas();
    
    // - Create animation queues (triggered with play method) ---
  
    $(this.canvas).velocity(
      { opacity: 1, top: '0%' },
      {
        duration: 1000,
        queue: exports.ANIMATION_SHOW
      }
    );
    
    // - Bind listeners ---
    
    this.canvas.addEventListener('pointerdown', this);
    this.canvas.addEventListener('pointerup', this);
    this.canvas.addEventListener('pointercancel', this);
    this.canvas.addEventListener('pointermove', this);
    // this.canvas.addEventListener('pointermove', this.handleEvent.bind(this).throttle(75));
    this.canvas.addEventListener('pointermove', this);
            
    // - Draw dynamic elements ---
    // requestAnimationFrame(updateCanvas);
  };
  
  exports.instance.prototype._containPageInCanvas = function(canvasW, canvasH){
    var pageAspect = this.pageImg.width / this.pageImg.height;
    
    var containPageW, containPageH;
    
    // Ala http://blog.vjeux.com/2013/image/css-container-and-cover.html
    
    var letterboxOffsetX = 0, letterboxOffsetY = 0;
    
    if(pageAspect <= this.canvasAspect){ // viewport wider than scaled image
      containPageW = canvasH * pageAspect;
      containPageH = canvasH;
      
      letterboxOffsetX = (canvasW - containPageW) / 2;
    }
    else { // viewport taller than scaled image
      containPageW = canvasW;
      containPageH = canvasW / pageAspect;
      
      letterboxOffsetY = (canvasH - containPageH) / 2;
    }
    
    return {
      originX: letterboxOffsetX,
      originY: letterboxOffsetY,
      pageWidth: containPageW,
      pageHeight: containPageH
    };
  };
  
  exports.instance.prototype.sizeCanvas = function(){
    var width = $(this.canvas).parent('.canvas-container').width();
    var height = width / this.canvasAspect;
    
    // Don't set canvas size using CSS properties! Will result in pixel scaling instead of viewport scaling.
    // http://stackoverflow.com/a/331462
    
    this.canvas.width  = width;
    this.canvas.height = height;
  };
  
  exports.instance.prototype.sizePage = function(isInit){
    this.page = this._containPageInCanvas(this.canvas.width, this.canvas.height);
    
    if(!isInit)
      return;
    
    this.origPage = { // simple clone!
      originX:    this.page.originX,
      originY:    this.page.originY,
      pageWidth:  this.page.pageWidth,
      pageHeight: this.page.pageHeight
    }
    
    if(!storageAvailable())
      return;
    
    if(window.sessionStorage.getItem('orig-page')){ // restore an old drawing session
      this.origPage = JSON.parse(window.sessionStorage.getItem('orig-page'));
    }
    else { // first or new drawing session
      try {
        window.sessionStorage.setItem('orig-page', JSON.stringify(this.origPage));
      }
      catch(e){ console.log('Unable to store original (scaled) page dimensions!'); }
    }
  };
    
  /*
   * <stampRotation> and <ignoreHistory> are optional, and used
   * when re-drawing stamps from history.
   */
  exports.instance.prototype.stampBrush = function(x, y, stampRotation, ignoreHistory){
    var origPageX, origPageY; // relative to page, in original page scaling
    var pageX, pageY; // relative to page, in current scaling
    var stampX, stampY; // relative to current canvas
    
    if(!ignoreHistory){ // we're live
      pageX = x - this.page.originX;
      pageY = y - this.page.originY;
      
      origPageX = pageX * this.origPage.pageWidth / this.page.pageWidth;
      origPageY = pageY * this.origPage.pageHeight / this.page.pageHeight;
      
      stampX = x;
      stampY = y;
    }
    else { // we're in a replay
      // stored coords are in un-resized canvas space
      // convert to resized canvas coords (function of the current viewport)
      origPageX = x - this.origPage.originX;
      origPageY = y - this.origPage.originY;
      
      pageX = origPageX * this.page.pageWidth / this.origPage.pageWidth;
      pageY = origPageY * this.page.pageHeight / this.origPage.pageHeight;
      
      stampX = this.page.originX + pageX;
      stampY = this.page.originY + pageY;
    }
    
    // ---
    
    this.ctx.save();
    
    this.ctx.translate(stampX, stampY);
    
    var rotation;
    if(stampRotation)
      rotation = stampRotation;
    else
      rotation = 2 * Math.PI * Math.random();
    
    this.ctx.rotate(rotation);
    this.ctx.drawImage(this.brush, -this.brush.width/2, -this.brush.height/2);
    
    this.ctx.restore();
    
    if(ignoreHistory)
      return;
    
    if(!storageAvailable()){
      console.log('Unable to store stamp history!');
      return;
    }
    
    // Save brush location & rotation to a running list, to be reconstructed at page load
    var storageKey = 'page-' + ('00' + this.pageNo).slice(-2);
    
    var stampHistory = window.sessionStorage.getItem(storageKey);
    if(!stampHistory)
      stampHistory = '';
    
    var historyEntry = (this.origPage.originX+origPageX).toFixed(4) + ':' + (this.origPage.originY+origPageY).toFixed(4) + ':' + rotation.toFixed(4) + ':' + this.brushColor;
    
    try {
      if(stampHistory.length === 0)
        window.sessionStorage.setItem(storageKey, historyEntry);
      else
        window.sessionStorage.setItem(storageKey, stampHistory + ',' + historyEntry);
    }
    catch(e){ // setItem() can throw an exception if we run out of space, or have switched to private browsing in iOS Safari
      window.sessionStorage.removeItem(storageKey);
    }
  };
  
  exports.instance.prototype.stampSegment = function(start, end, spacing, remainLength){
    var startX = start[0], startY = start[1];
    var endX = end[0], endY = end[1];
    
    var length = Math.sqrt((endX-startX)*(endX-startX) + (endY-startY)*(endY-startY));
    
    if(length > 0){
      var invLength = 1/length;
      var normX = (endX-startX) * invLength;
      var normY = (endY-startY) * invLength;
      
      var offsetX = 0, offsetY = 0;
      
      var drawLength = length + remainLength;
      while(drawLength >= spacing){
        if(remainLength > 0){
          offsetX += normX * (spacing - remainLength);
          offsetY += normY * (spacing - remainLength);
          
          remainLength = 0;
        }
        else {
          offsetX += normX * spacing;
          offsetY += normY * spacing;
        }
        
        this.stampBrush(startX+offsetX, startY+offsetY);
        
        drawLength -= spacing;
      }
      return drawLength;
    }
  };
  
  exports.instance.prototype.handleEvent = function(evt){
    evt.preventDefault();
    
    // draw brush underneath other elements already drawn
    this.ctx.globalCompositeOperation = 'destination-over';
    
    var canvasClientRect = this.canvas.getBoundingClientRect();
    
    switch(evt.type){
      case 'pointerdown':
        this.touches[evt.pointerId] = {
          remainLength: 0, // remaining length in stroke not covered by stamps
          pageX:        evt.pageX,
          pageY:        evt.pageY,
          clientX:      evt.clientX,
          clientY:      evt.clientY
        };
        
        var relX = evt.clientX - canvasClientRect.left;
        var relY = evt.clientY - canvasClientRect.top;
        
        this.stampBrush(relX, relY);
        break;
      case 'pointermove':
        var foundTouch = this.touches[evt.pointerId];
        if(!foundTouch)   // move event was not part of a drag (only happens when using a mouse)
          break;
        
        var startX = foundTouch.clientX - canvasClientRect.left;
        var startY = foundTouch.clientY - canvasClientRect.top;
        
        var endX = evt.clientX - canvasClientRect.left;
        var endY = evt.clientY - canvasClientRect.top;
        
        var remainLength = this.stampSegment([startX, startY], [endX, endY], this.brushSpacing, foundTouch.remainLength);
        
        this.touches[evt.pointerId] = { // replace the touch stored for the ID
          remainLength: remainLength,
          pageX:        evt.pageX,
          pageY:        evt.pageY,
          clientX:      evt.clientX,
          clientY:      evt.clientY
        };
        break;
      case 'pointerup':
        var foundTouch = this.touches[evt.pointerId];
        if(!foundTouch)   // up event was not part of a drag (only happens when using a mouse)
          break;
        
        var startX = foundTouch.clientX - canvasClientRect.left;
        var startY = foundTouch.clientY - canvasClientRect.top;
        
        var endX = evt.clientX - canvasClientRect.left;
        var endY = evt.clientY - canvasClientRect.top;
      
        this.stampSegment([startX, startY], [endX, endY], this.brushSpacing, foundTouch.remainLength);
        
        delete this.touches[evt.pointerId]; // remove the stored touch
        break;
      case 'pointercancel':
        delete this.touches[evt.pointerId];
        break;
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  };
    
  // - Public API ---
  
  exports.instance.prototype.play = function(animationName){
    $(this.canvas).dequeue(animationName);
  };
        
  exports.instance.prototype.drawPage = function(){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    
    // Fit image inside of canvas (ala CSS background-size: contain)
    
    this.ctx.clearRect(0,0, this.canvas.width,this.canvas.height);
    this.ctx.drawImage(this.pageImg, this.page.originX, this.page.originY, this.page.pageWidth, this.page.pageHeight);
    
    this.ctx.restore();
    
    // - Replay previous stamp history, if any ---
    if(!storageAvailable())
      return;
    
    this.ctx.globalCompositeOperation = 'destination-over';
    
    var storageKey = 'page-' + ('00' + this.pageNo).slice(-2);
    var stampHistory = window.sessionStorage.getItem(storageKey);
    
    if(stampHistory){
      var currentBrushColor = this.brushColor; // save brush color before we replay history
      
      var stamps = stampHistory.split(',');
      var stamp, x, y, rot, color;
      
      for(var stampI=0; stampI < stamps.length; stampI++){
        stamp = stamps[stampI].split(':');
        x = parseFloat(stamp[0]);
        y = parseFloat(stamp[1]);
        rot = parseFloat(stamp[2]);
        color = stamp[3];
        
        if(color !== this.brushColor)
          this.setBrushColor(color);
        
        this.stampBrush(x, y, rot, true); // true = ignore history
      }
      
      this.setBrushColor(currentBrushColor); // restory brush color from before history replay
    }
    
    this.ctx.globalCompositeOperation = 'source-over'; // back to default
  };
  
  exports.instance.prototype.setBrush = function(brushFilename){
    this.brushImg.src = brushFilename;
  };
  
  exports.instance.prototype.setPage = function(pageNo){
    this.pageNo = pageNo;
    this.pageImg.src = 'assets/page-' + ('00' + pageNo).slice(-2) + '.png';
  };
  
  exports.instance.prototype.loadBrush = function(callback){
    if(this.brushCallback){
      this.brushImg.removeEventListener('load', this.brushCallback);
    }
    
    this.brushCallback = callback.bind(this);
    this.brushImg.addEventListener('load', this.brushCallback);    
  };
  
  exports.instance.prototype.loadPage = function(callback){
    if(this.pageCallback){
      this.pageImg.removeEventListener('load', this.pageCallback);
    }
    
    this.pageCallback = callback.bind(this);
    this.pageImg.addEventListener('load', this.pageCallback);
  };
  
  exports.instance.prototype.updateBrushCanvas = function(brushImage){
    // set canvas size to match newly loaded image size
    this.brush.width = brushImage.width;
    this.brush.height = brushImage.height;
    this.brushCtx = this.brush.getContext('2d');
    
    this.brushCtx.clearRect(0,0, this.brush.width,this.brush.height);
  };
  
  exports.instance.prototype.setBrushColor = function(color){
    this.brushColor = color;
    
    this.brushCtx.clearRect(0,0, this.brush.width,this.brush.height);
    this.brushCtx.drawImage(this.brushImg, 0,0);
    // $('.canvas-container').append(this.brush);
    
    // Draw a tinted version of the brush image to the offscreen canvas
    this.brushCtx.save();
    this.brushCtx.globalCompositeOperation = 'source-atop';
    this.brushCtx.fillStyle = color;
    this.brushCtx.fillRect(0,0, this.brush.width,this.brush.height);
    
    this.brushCtx.restore();
  };
  
})(jQuery, window.GraphCanvas = {});