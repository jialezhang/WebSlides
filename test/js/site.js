(function($){

  var Renderer = function(elt){
    var dom = $(elt)
    // var canvas = dom.get(0)
    var canvas = document.getElementsByTagName('canvas')[0]
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)
    var sys = null

    var _vignette = null
    var selected = null,
        nearest = null,
        _mouseP = null;

    var that = {
      init:function(pSystem){
        sys = pSystem
        // sys.screen({size:{width:dom.width(), height:dom.height()},
        //             padding:[36,60,36,60]})
        sys.screen({size:{width:800, height:700}
                    // padding:[36,60,36,60]
                   })

        $(window).resize(that.resize)
        that.resize()
        that._initMouseHandling()

        if (document.referrer.match(/echolalia|atlas|halfviz/)){

          that.switchSection('demos')
        }
      },
      resize:function(){
        // canvas.width = $(window).width()
        // canvas.height = .75* $(window).height()
        canvas.width = 800
        canvas.height = 700
        sys.screen({size:{width:canvas.width, height:canvas.height}})
        _vignette = null
        that.redraw()
      },
      redraw:function(){
        gfx.clear()
        sys.eachEdge(function(edge, p1, p2){
          if (edge.source.data.alpha * edge.target.data.alpha == 0) return
          gfx.line(p1, p2, {stroke:"#8ad8ef", width:2, alpha:edge.target.data.alpha})
        })
        sys.eachNode(function(node, pt){
          var w = Math.max(20, 20+gfx.textWidth(node.name) )
          if (node.data.alpha===0) return
          if (node.data.shape=='dot'){
            gfx.oval(pt.x-w/2, pt.y-w/2, w, w, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(node.name, pt.x, pt.y+7, {color:"white", align:"center", font:"Arial", size:12})
            gfx.text(node.name, pt.x, pt.y+7, {color:"white", align:"center", font:"Arial", size:12})
          }else{
            gfx.rect(pt.x-w/2, pt.y-8, w, 20, 4, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Arial", size:12})
            gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Arial", size:12})
          }
        })
        that._drawVignette()
      },
      
      _drawVignette:function(){
        var w = canvas.width
        var h = canvas.height
        var r = 20

        if (!_vignette){
          var top = ctx.createLinearGradient(0,0,0,r)
          top.addColorStop(0, "#e0e0e0")
          top.addColorStop(.7, "rgba(255,255,255,0)")

          var bot = ctx.createLinearGradient(0,h-r,0,h)
          bot.addColorStop(0, "rgba(255,255,255,0)")
          bot.addColorStop(1, "white")

          _vignette = {top:top, bot:bot}
        }
        
        // top
        ctx.fillStyle = _vignette.top
        ctx.fillRect(0,0, w,r)

        // bot
        ctx.fillStyle = _vignette.bot
        ctx.fillRect(0,h-r, w,r)
      },

      switchMode:function(e){
        if (e.mode=='hidden'){
          dom.stop(true).fadeTo(e.dt,0, function(){
            if (sys) sys.stop()
            $(this).hide()
          })
        }else if (e.mode=='visible'){
          dom.stop(true).css('opacity',0).show().fadeTo(e.dt,1,function(){
            that.resize()
          })
          if (sys) sys.start()
        }
      },
      
      switchSection:function(newSection){
        var parent = sys.getEdgesFrom(newSection)[0].source
        var children = $.map(sys.getEdgesFrom(newSection), function(edge){
          return edge.target
        })
        
        sys.eachNode(function(node){
          if (node.data.shape=='dot') return // skip all but leafnodes

          var nowVisible = ($.inArray(node, children)>=0)
          var newAlpha = (nowVisible) ? 1 : 0
          var dt = (nowVisible) ? .5 : .5
          sys.tweenNode(node, dt, {alpha:newAlpha})

          if (newAlpha==1){
            node.p.x = parent.p.x + .05*Math.random() - .025
            node.p.y = parent.p.y + .05*Math.random() - .025
            node.tempMass = .001
          }
        })
      },
      
      
      _initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var oldmass = 1

        var _section = null

        var handler = {
          moved:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = sys.nearest(_mouseP);

            if (!nearest.node) return false

            if (nearest.node.data.shape!='dot'){
              selected = (nearest.distance < 50) ? nearest : null
              if (selected){
                 dom.addClass('linkable')
                 window.status = selected.node.data.link.replace(/^\//,"http://"+window.location.host+"/").replace(/^#/,'')
              }
              else{
                 dom.removeClass('linkable')
                 window.status = ''
              }
            }else if ($.inArray(nearest.node.name, ['萌宠','猫','兔','狗','其他']) >=0 ){
              if (nearest.node.name!=_section){
                _section = nearest.node.name
                that.switchSection(_section)
              }
              dom.removeClass('linkable')
              window.status = ''
            }
            
            return false
          },
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = sys.nearest(_mouseP);
            
            if (nearest && selected && nearest.node===selected.node){
              var link = selected.node.data.link
              if (link.match(/^#/)){
                 $(that).trigger({type:"navigate", path:link.substr(1)})
              }else{
                 window.location = link
              }
              return false
            }
            
            
            if (dragged && dragged.node !== null) dragged.node.fixed = true

            $(canvas).unbind('mousemove', handler.moved);
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = sys.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null;
            // selected = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            $(canvas).bind('mousemove', handler.moved);
            _mouseP = null
            return false
          }


        }

        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.moved);

      }
    }
    
    return that
  }
  
  $(document).ready(function(){
    var CLR = {
      branch:"#8ad8ef",
      cat:"#f9d124",
      rabbit:"#fa6115",
      dog:"#99bc22",
      haha:"#a13767"
    };

    var theUI = {
      nodes:{"萌宠":{color:"#da4839", shape:"dot", alpha:1}, 
      
             '狗':{color:CLR.branch, shape:"dot", alpha:1}, 
             '哈士奇':{color:CLR.dog, alpha:0, link:''},
             '博美':{color:CLR.dog, alpha:0, link:''},
             '萨摩耶':{color:CLR.dog, alpha:0, link:''},
             '吉娃娃':{color:CLR.dog, alpha:0, link:''},
             '牛头梗':{color:CLR.dog, alpha:0, link:''},

             '兔':{color:CLR.branch, shape:"dot", alpha:1}, 
             '安哥拉兔':{color:CLR.rabbit, alpha:0, link:''},
             '荷兰垂耳兔':{color:CLR.rabbit, alpha:0, link:''},
             '中国白兔':{color:CLR.rabbit, alpha:0, link:''},
             '熊猫兔':{color:CLR.rabbit, alpha:0, link:''},

             '猫':{color:CLR.branch, shape:"dot", alpha:1},
             '英国短毛猫':{color:CLR.cat, alpha:0, link:''},
             "波斯猫":{color:CLR.cat, alpha:0, link:''},
             "挪威森林猫":{color:CLR.cat, alpha:0, link:''},
             "云猫":{color:CLR.cat, alpha:0, link:''},
             "喜马拉雅猫 ":{color:CLR.cat, alpha:0, link:''},

             '其他':{color:CLR.branch, shape:"dot", alpha:1}, 
             '龙猫':{color:CLR.haha, alpha:0, link:'#reference'},
             introduction:{color:CLR.doc, alpha:0, link:''}
            },
      edges:{
        "萌宠":{
         '狗':{length:.8},
          '兔':{length:.8},
          '猫':{length:.8},
          '其他':{length:.8}
        },
        '狗':{"哈士奇":{},
              "博美":{},
             '萨摩耶':{},
             '吉娃娃':{},
             '牛头梗':{}
        },
        '兔':{"安哥拉兔":{},
              "荷兰垂耳兔":{},
              '中国白兔':{},
              '熊猫兔':{}
        },
        '猫':{"英国短毛猫":{},
              "波斯猫":{},
              "挪威森林猫":{},
              "云猫":{},
             "喜马拉雅猫 ":{}

             },
        '其他':{"龙猫":{}
        }
      }
    }


    var sys = arbor.ParticleSystem()
    sys.parameters({stiffness:900, repulsion:2000, gravity:true, dt:0.015})
    sys.renderer = Renderer("#show_animal")
    sys.graft(theUI)
  })
 })(this.jQuery)
