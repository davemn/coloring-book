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
    
    this.relMousePos = {x:0, y:0};
    
    this.swatchSize = 20;
    this.swatchPadding = 8;
    
    this.brushSpacing = 25;
    this.touches = {};
    
    this.pageNo = 0;
    this.brushColor = '#fff';
    
    this.brushImg = new Image();
    this.pageImg = new Image();
    
    // - Size & setup drawing environment ---
    this.canvas = $canvas.get(0);
    this.ctx = this.canvas.getContext('2d');
    
    this.brush = document.createElement('canvas');
    this.brushCtx = null;
    
    // ---
    
    if(opts.aspectRatio){
      var width = $canvas.parent('.canvas-container').width();
      var height = width / opts.aspectRatio;
      
      // Don't set canvas size using CSS properties! Will result in pixel scaling instead of viewport scaling.
      // http://stackoverflow.com/a/331462
      
      this.canvas.width  = width;
      this.canvas.height = height;
    }
    
    // - Create animation queues (triggered with play method) ---
  
    $(this.canvas).velocity(
      { opacity: 1, top: '0%' },
      {
        duration: 1000,
        queue: exports.ANIMATION_SHOW
      }
    );
    
    // - Bind listeners ---
    
    $canvas.mousemove({outerThis:this, canvas:this.canvas, ctx:this.ctx}, this._updateMousePos);
    
    this.canvas.addEventListener('touchstart', this);
    this.canvas.addEventListener('touchend', this);
    this.canvas.addEventListener('touchcancel', this);
    this.canvas.addEventListener('touchmove', this);
            
    // - Draw dynamic elements ---
    // requestAnimationFrame(updateCanvas);
  };
  
  /*
   * <stampRotation> and <ignoreHistory> are optional, and used
   * when re-drawing stamps from history.
   */
  exports.instance.prototype.stampBrush = function(x, y, stampRotation, ignoreHistory){
    this.ctx.save();
    
    this.ctx.translate(x, y);
    
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
    
    var historyEntry = Math.floor(x) + ':' + Math.floor(y) + ':' + rotation.toFixed(4) + ':' + this.brushColor;
    
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
    
    var curTouch = evt.changedTouches;
    var canvasClientRect = this.canvas.getBoundingClientRect();
        
    switch(evt.type){
      case 'touchstart':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          this.touches[curTouch[touchI].identifier] = {
            remainLength: 0, // remaining length in stroke not covered by stamps
            pageX:        curTouch[touchI].pageX,
            pageY:        curTouch[touchI].pageY,
            clientX:      curTouch[touchI].clientX,
            clientY:      curTouch[touchI].clientY
          };
          
          var relX = curTouch[touchI].clientX - canvasClientRect.left;
          var relY = curTouch[touchI].clientY - canvasClientRect.top;
          
          this.stampBrush(relX, relY);
        }
        break;
      case 'touchmove':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var foundId = curTouch[touchI].identifier;
          if(!this.touches[foundId]){
            console.log('Unable to continue touch!');
            continue;
          }
          
          var startX = this.touches[foundId].clientX - canvasClientRect.left;
          var startY = this.touches[foundId].clientY - canvasClientRect.top;
          
          var endX = curTouch[touchI].clientX - canvasClientRect.left;
          var endY = curTouch[touchI].clientY - canvasClientRect.top;
          
          var remainLength = this.stampSegment([startX, startY], [endX, endY], this.brushSpacing, this.touches[foundId].remainLength);
          
          this.touches[foundId] = { // replace the touch stored for the ID
            remainLength: remainLength,
            pageX:        curTouch[touchI].pageX,
            pageY:        curTouch[touchI].pageY,
            clientX:      curTouch[touchI].clientX,
            clientY:      curTouch[touchI].clientY
          };
        }
        break;
      case 'touchend':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var foundId = curTouch[touchI].identifier;
          if(!this.touches[foundId]){
            console.log('Unable to find touch to end!');
            continue;
          }
          
          var startX = this.touches[foundId].clientX - canvasClientRect.left;
          var startY = this.touches[foundId].clientY - canvasClientRect.top;
          
          var endX = curTouch[touchI].clientX - canvasClientRect.left;
          var endY = curTouch[touchI].clientY - canvasClientRect.top;
          
          this.stampSegment([startX, startY], [endX, endY], this.brushSpacing, this.touches[foundId].remainLength);
          
          delete this.touches[foundId]; // remove the stored touch
        }
        
        break;
      case 'touchcancel':
        for(var touchI=0; touchI < curTouch.length; touchI++){
          var foundId = curTouch[touchI].identifier;
          if(!this.touches[foundId]){
            console.log('Unable to find touch to cancel!');
            continue;
          }
          
          delete this.touches[foundId];
        }
        
        break;
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  };
    
  // Ala http://stackoverflow.com/a/17130415
  exports.instance.prototype._updateMousePos = function(evt){
    // evt.pageX, evt.pageY // use instead of client[X|Y] or offset[X|Y]!
    // jQuery normalizes page[X|Y], but we need viewport-relative 
    var outerThis = evt.data.outerThis;
    var canvas = evt.data.canvas;
    var ctx = evt.data.ctx;
    
    var rect = canvas.getBoundingClientRect();
    
    // mouse position relative to the top-left of the canvas
    outerThis.relMousePos.x = evt.clientX - rect.left;
    outerThis.relMousePos.y = evt.clientY - rect.top;
  };
  
  // - Public API ---
  
  exports.instance.prototype.play = function(animationName){
    $(this.canvas).dequeue(animationName);
  };
      
  exports.instance.prototype.drawPage = function(){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    
    // TODO fit image inside of canvas (ala CSS background-size: contain)
    
    this.ctx.clearRect(0,0, this.canvas.width,this.canvas.height);
    // this.ctx.drawImage(this.pageImg, 0, 0);
    
    var canvasAspect = this.canvas.width / this.canvas.height;
    var pageAspect   = this.pageImg.width / this.pageImg.height;
    
    var containPageW = this.pageImg.width;
    var containPageH = this.pageImg.width;
    
    // r_image = pageAspect
    // r_viewport = canvasAspect
    // w'_image = containPageW
    // h'_image = containPageH
    // h_viewport = this.canvas.height
    // w_viewport = this.canvas.width
    
    var letterboxOffsetX = 0, letterboxOffsetY = 0;
    
    if(pageAspect <= canvasAspect){ // viewport wider than scaled image
      containPageW = this.canvas.height * pageAspect;
      containPageH = this.canvas.height;
      
      letterboxOffsetX = (this.canvas.width - containPageW) / 2;
    }
    else { // viewport taller than scaled image
      containPageW = this.canvas.width;
      containPageH = this.canvas.width / pageAspect;
      
      letterboxOffsetY = (this.canvas.height - containPageH) / 2;
    }
    
    this.ctx.drawImage(this.pageImg, letterboxOffsetX, letterboxOffsetY, containPageW, containPageH);
    
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
        x = stamp[0];
        y = stamp[1];
        rot = stamp[2];
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
    this.pageImg.src = 'page-' + ('00' + pageNo).slice(-2) + '.png';
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