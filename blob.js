
<script type="text/javascript">

(function($){

    "use strict";

    var mypaper;

    $(document).ready(function() {

        // initialize the paper animation
        mypaper = new PaperWrap( $('#blob')[0] );

        // the footer
        $(".footer .toggle").mouseenter(function() {
            $(".footer").addClass("info-is-visible");
        });
        $(".footer").mouseleave(function() {
            $(".footer").removeClass("info-is-visible");
        });
        
    });

    function fitPaperWraps() {
        mypaper.fit();
    }

    $(window).resize(function() {

        waitForFinalEvent(function(){
            
            fitPaperWraps();

        }, 50, "resizing-papers");

    });

    var waitForFinalEvent = (function () {
        var timers = {};
            return function (callback, ms, uniqueId) {
        if (!uniqueId) {
            uniqueId = "Don't call this twice without a uniqueId";
        }
        if (timers[uniqueId]) {
            clearTimeout (timers[uniqueId]);
        }
        timers[uniqueId] = setTimeout(callback, ms);
        };
    })();

    function PaperWrap( canvasElement ) {

        var mypaper = new paper.PaperScope();
        mypaper.setup( canvasElement );

        var view = mypaper.view,
            Point = mypaper.Point,
            Path = mypaper.Path,
            Group = mypaper.Group,
            Color = mypaper.Color;

        // adjustable variables
        var mouseForce = 0.1;
        // other variables
        var mousePoint = new Point(-1000, -1000);
        
        var getRadius = function(){
            var radius = 0;
            if(view.size.width >= 1024){
                radius = Math.min( view.size.width, view.size.height/2 ) / 2;
                radius = Math.floor( radius * 0.85 );
            }else{
                radius = Math.min( 1024, view.size.height/2 ) / 2;
                radius = Math.floor( radius * 0.95 );
            }
            
        
            return radius;
        }

        function Blob(center, size, color) {
            this.build(center, size, color);
        }

        Blob.prototype = {
            build: function(center, radius, color) {
                //manipulate
                center.y = center.y/2;
                var padding = Math.min(view.size.width, view.size.height) * 0.2;

                
                var timeScale = 1;
                var maxWidth = view.size.width - padding * 2;
                var maxHeight = view.size.height - padding * 2;
                var w = maxWidth * timeScale;
                var h = maxHeight * timeScale;

                this.fitRect = new Path.Rectangle({
                    point: [view.size.width / 2 - w / 2, view.size.height / 2 - h / 2],
                    size: [w, h]
                });


                //Blur Path
                this.blurPath = new Path.Circle(center, w);
        
this.blurPath.fillColor= {
                    gradient: {
                        stops:[new Color(1, .42, 0, 1),new Color(1, .42, 0, .60), new Color(1, .42, 0, 0)],
                        radial: true
                    },
                    origin: this.blurPath.position,
                    destination: this.blurPath.bounds.rightCenter
                };
                
                this.circlePath = new Path.RegularPolygon(center, 15, radius);
                
                this.group = new Group([this.circlePath,this.blurPath]);
                //this.group.strokeColor = "black";
                this.group.position = view.center;
                
         
                this.circlePath.fillColor= {
                    gradient: {
                        stops: [['#FF6B00', 0.0], ['#FF6B00', 0.5], ['#FF842C', 1]],
                        radial: true
                    },
                    origin: this.circlePath.position,
                    destination: this.circlePath.bounds.rightCenter
                };
                this.circlePath.strokeColor = new Color(1, .5, .04, .5);
                //new Color(1, .5, .04, 1)
                this.circlePath.strokeWidth = 30;
                this.circlePath.fullySelected = false;
                
                // Mausdistanz
                this.threshold = radius * 1.1;
                this.center = center;
                // Elemente hinzufügen
                this.circlePath.flatten(radius * 1.5);
                // wieder zum Kreis machen
                this.circlePath.smooth();
                // einpassen in das fitRect
                //this.circlePath.fitBounds( this.fitRect.bounds );

                // control circle erstellen, auf den die einzelnen Punkte später zurückgreifen können
                this.controlCircle = this.circlePath.clone();
                this.controlCircle.fullySelected = false;
                this.controlCircle.visible = false;

                var rotationMultiplicator = radius / 250;

                // Settings pro segment
                this.settings = [];
                for( var i = 0; i < this.circlePath.segments.length; i++ ) {
                    var segment = this.circlePath.segments[i];
                    this.settings[i] = {
                        relativeX: segment.point.x - this.center.x,
                        relativeY: segment.point.y - this.center.y,
                        offsetX: rotationMultiplicator,
                        offsetY: rotationMultiplicator,
                        momentum: new Point(0,0)
                    };
                }
            },
            clear: function() {
                this.circlePath.remove();
                this.blurPath.remove();
                this.fitRect.remove();
            },
            animate: function(event) {
                
                this.group.rotate(-0.01, view.center);

                for( var i = 0; i < this.circlePath.segments.length; i++ ) {
                    var segment = this.circlePath.segments[i];

                    var settings = this.settings[i];
                    var controlPoint = new Point(
                        //settings.relativeX + this.center.x,
                        //settings.relativeY + this.center.y
                    );
                    controlPoint = this.controlCircle.segments[i].point;

                    // Avoid the mouse
                    var mouseOffset = mousePoint.subtract(controlPoint);
                    var mouseDistance = mousePoint.getDistance( controlPoint );
                    var newDistance = 0;

                    if( mouseDistance < this.threshold ) {
                        newDistance = (mouseDistance - this.threshold) * mouseForce;
                    }

                    var newOffset = new Point(0, 0);
                    if(mouseDistance !== 0){
                        newOffset = new Point(mouseOffset.x / mouseDistance * newDistance, mouseOffset.y / mouseDistance * newDistance);
                    }
                    var newPosition = controlPoint.add( newOffset );

                    var distanceToNewPosition = segment.point.subtract( newPosition );

                    settings.momentum = settings.momentum.subtract( distanceToNewPosition.divide( 6 ) );
                    settings.momentum = settings.momentum.multiply( 0.6 );
                    
                    // Add automatic rotation
                    
                    var amountX = settings.offsetX;
                    var amountY = settings.offsetY;
                    var sinus = Math.sin(event.time + i*2);
                    var cos =  Math.cos(event.time + i*2);
                    settings.momentum = settings.momentum.add( new Point(cos * -amountX, sinus * -amountY) );
                    
                    // go to the point, now!
                    segment.point = segment.point.add( settings.momentum );

                }
            }
        };
        
       // var radius = Math.min( view.size.width, view.size.height) / 2 * .85;
        var blob = new Blob( view.bounds.center, getRadius(), 'black');

        view.onFrame = function(event) {
            blob.animate(event);
        };

        $.support.touch = 'ontouchstart' in window;
        if( !$.support.touch ) {
            // this should only run if on a non-touch device, but it keeps running everywhere
        }
        var tool = new mypaper.Tool();
        tool.onMouseMove = function(event) {
            mousePoint = event.lastPoint;
        };


        var fit = this.fit = function() {

            var $canvas = $( view.element );

            var canvasWidth = $canvas.width();
            var canvasHeight = $canvas.height();

            $canvas
                .attr("width", canvasWidth)
                .attr("height", canvasHeight);
            
            mypaper.view.viewSize = new mypaper.Size( canvasWidth, canvasHeight);
        };
        
        

        function redrawblob() {

            // overwrite the global paper object with the local one
            paper = mypaper;

            blob.clear();
            blob = null;
            blob = new Blob( view.bounds.center, getRadius(), '#ff6B00');
        }
        
        view.onResize = function(event) {
            redrawblob();
        };
    }
})(jQuery);

    </script>    