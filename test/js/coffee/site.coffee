$ = Jquery
($) ->
  Render = (elt) ->
  dom = $(elt)
  canvas = document.getElementsByTagName('canvas')[0]
  ctx = canvas.getContext('2d')
  gfx = arbor.Graphics(canvas)
  sys = null

  vigentte = null
  selected = null
  nearst = null
  _mouseP = null

  that = 
    init: (pSystem) ->
      sys = pSystem
      sys.screen({
        size:{width:dom.width(),height:dom.height()},
        padding:[36,60,36,60]
        })
      $(window).resize(that.resize)
      that.resize()
      that._initMouseHandling()

      if (document.referrer.match(/echolalia|atlas|halfviz/))
        that.switchSection('demos')
    resize: ->
      canvas.width = $(window,width()
      canvas.height = .75 * $(window).height()
      sys.screen({size:{width:canvas.width,height:canvas.height}})
    #   _vignette = null
    #   that.redraw()
    # redraw: ->
    #   gfx.clear()
    #   sys.eachEdge((edge,p1,p2) ->
    #     if edge.source.data.alpha * edge.target.data.alpha is 0
    #       return
    #     gfx.line(p1,p2,{stroke:"#8ad8ef", width:2, alpha:edge.target.data.alpha})
    #     )
    #   sys.eachNode()
  
