(function($, exports){
  exports.ANIMATION_SHOW = 'show';
  
  exports.instance = function(opts){
    var $canvas = opts.$canvas;
    
    this.relMousePos = {x:0, y:0};
    
    this.swatchSize = 20;
    this.swatchPadding = 8;
    
    this.brushSpacing = 25;
    this.touches = {};
    
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
  
  exports.instance.prototype.stampBrush = function(x, y){
    this.ctx.fillStyle = '#7ec247';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 12, 0,2*Math.PI);
    this.ctx.fill();
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
  
  exports.instance.prototype.drawSwatchGrid = function(swatches, x, y){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'black';
    
    var curPos = {x: x, y: y};
    
    var swatchI=0;
    for(var swatch in swatches){
      if(swatchI !== 0 && (swatchI%7) === 0){ // start new row
        curPos.x = x;
        curPos.y += this.swatchSize + this.swatchPadding;
      }
    
      this.ctx.fillStyle = swatches[swatch];
      this.ctx.fillRect(curPos.x, curPos.y, this.swatchSize, this.swatchSize);
      
      this.ctx.strokeRect(curPos.x, curPos.y, this.swatchSize, this.swatchSize);
      
      curPos.x += this.swatchSize + this.swatchPadding;
     
      swatchI++;
    }
    
    this.ctx.restore();
  };
  
  exports.instance.prototype.play = function(animationName){
    $(this.canvas).dequeue(animationName);
  };
  
  exports.instance.prototype.drawCircle = function(x, y, radius){
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0,2*Math.PI);
    this.ctx.stroke();
    this.ctx.fill();
  };
    
  exports.instance.prototype.drawPage = function(){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    
    this.ctx.clearRect(0,0, this.canvas.width,this.canvas.height);
    
    // this.ctx.fillStyle = 'gray';
    // this.ctx.fillRect(0,0, this.canvas.width,this.canvas.height);
    
    // this.ctx.globalCompositeOperation = 'source-over';
    
    this.ctx.drawImage(this.pageImg, 0, 0);
    
    this.ctx.restore();
  };
  
  exports.instance.prototype.setBrush = function(brushFilename){
    this.brushImg.src = brushFilename;
  };
  
  exports.instance.prototype.setPage = function(pageNo){
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
  
})(jQuery, window.GraphCanvas = {});