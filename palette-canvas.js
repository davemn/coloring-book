(function($, exports){
  exports.ANIMATION_SHOW = 'show';
  
  exports.instance = function(opts){
    var $canvas = opts.$canvas;
    this.swatches = opts.swatches;
    
    this.swatchSize = 40;
    this.swatchPadding = 8;
    
    this.origin = [8.5,8.5]; // 8.5, 8.5 TODO center palette
    this.touches = {};
    
    // - Size & setup drawing environment ---
    this.canvas = $canvas.get(0);
    this.ctx = this.canvas.getContext('2d');
    
    // ---
    var width = $canvas.parent('.canvas-container').width();
    var height = this.swatchSize + (2*this.swatchPadding) + 0.5;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // - Bind listeners ---
    
    // this.canvas.addEventListener('touchstart', this);
    // this.canvas.addEventListener('touchend', this);
    // this.canvas.addEventListener('touchcancel', this);
    // this.canvas.addEventListener('touchmove', this);
    
    this.drawSwatchGrid(this.swatches, this.origin[0], this.origin[1]);
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
      
  // - Public API ---
  
  exports.instance.prototype.drawSwatchGrid = function(swatches, x, y){
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'black';
    
    var curPos = {x: x, y: y};
    
    var swatchI=0;
    for(var swatch in swatches){
      this.ctx.fillStyle = swatches[swatch];
      this.ctx.fillRect(curPos.x, curPos.y, this.swatchSize, this.swatchSize);
      
      this.ctx.strokeRect(curPos.x, curPos.y, this.swatchSize, this.swatchSize);
      
      curPos.x += this.swatchSize + this.swatchPadding;
     
      swatchI++;
    }
    
    this.ctx.restore();
  };
          
  exports.instance.prototype.changeColor = function(callback){
    this.colorCallback = callback.bind(this);
  };
  
  exports.instance.prototype.setColor = function(color){
    if(this.colorCallback)
      this.colorCallback(color);
  };
  
})(jQuery, window.PaletteCanvas = {});