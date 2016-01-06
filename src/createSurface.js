const React = require("react");
const {
  Component,
  PropTypes
} = React;
const invariant = require("invariant");
const { fill, resolve, build } = require("./data");
const Shaders = require("./Shaders");
const findGLNodeInGLComponentChildren = require("./data/findGLNodeInGLComponentChildren");
const invariantStrictPositive = require("./data/invariantStrictPositive");

let _glSurfaceId = 1;

function logResult (data, contentsVDOM) {
  if (typeof console !== "undefined" &&
    console.debug // eslint-disable-line
  ) {
    console.debug("GL.Surface rendered with", data, contentsVDOM); // eslint-disable-line no-console
  }
}

module.exports = function (renderVcontainer, renderVcontent, renderVGL, getPixelRatio) {

  class GLSurface extends Component {
    constructor (props, context) {
      super(props, context);
      this._renderId = 0;
      this._id = _glSurfaceId ++;
    }
    componentWillMount () {
      Shaders._onSurfaceWillMount(this._id);
    }
    componentWillUnmount () {
      this._renderId = 0;
      Shaders._onSurfaceWillUnmount(this._id);
    }
    getGLCanvas () {
      return this.refs.canvas;
    }
    captureFrame () {
      const c = this.getGLCanvas();
      invariant(c && c.captureFrame, "captureFrame() should be implemented by GLCanvas");
      return c.captureFrame.apply(c, arguments);
    }
    render() {
      const id = this._id;
      const renderId = ++this._renderId;
      const props = this.props;
      const {
        style,
        width,
        height,
        pixelRatio: pixelRatioProps,
        children,
        debug,
        preload,
        opaque,
        visibleContent,
        eventsThrough,
        ...restProps
      } = props;

      const decorateOnShaderCompile = onShaderCompile =>
      onShaderCompile && // only decorated if onShaderCompile is defined
      ((error, result) =>
        renderId === this._renderId && // it's outdated. skip the callback call
        onShaderCompile(error, result)); // it's current. propagate the call

      const pixelRatio = pixelRatioProps || getPixelRatio(props);

      invariantStrictPositive(pixelRatio, "GL.Surface: pixelRatio prop");
      invariantStrictPositive(width, "GL.Surface: width prop");
      invariantStrictPositive(height, "GL.Surface: height prop");

      const context = {
        width,
        height,
        pixelRatio
      };
      const glNode = findGLNodeInGLComponentChildren(children, context);

      invariant(glNode && glNode.childGLNode, "GL.Surface must have in children a GL.Node or a GL Component");

      const { via, childGLNode } = glNode;

      let resolved;
      try {
        Shaders._beforeSurfaceBuild(id);
        resolved =
          resolve(
            fill(
              build(
                childGLNode,
                context,
                preload,
                via,
                id,
                decorateOnShaderCompile
              )));
      }
      catch (e) {
        throw e;
      }
      finally {
        Shaders._afterSurfaceBuild(id);
      }

      const { data, contentsVDOM, imagesToPreload } = resolved;

      if (debug) logResult(data, contentsVDOM);

      return renderVcontainer(
        { width, height, style, visibleContent, eventsThrough },
        contentsVDOM.map((vdom, i) =>
          renderVcontent(data.width, data.height, i, vdom, { visibleContent })),
        renderVGL({
          ...restProps, // eslint-disable-line no-undef
          width,
          height,
          pixelRatio,
          data,
          nbContentTextures: contentsVDOM.length,
          imagesToPreload,
          renderId,
          opaque,
          visibleContent,
          eventsThrough
        })
      );
    }
  }

  GLSurface.displayName = "GL.Surface";

  GLSurface.propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    pixelRatio: PropTypes.number,
    children: PropTypes.element.isRequired,
    opaque: PropTypes.bool,
    preload: PropTypes.bool,
    autoRedraw: PropTypes.bool,
    eventsThrough: PropTypes.bool,
    visibleContent: PropTypes.bool,
    onLoad: PropTypes.func,
    onProgress: PropTypes.func
  };

  GLSurface.defaultProps = {
    opaque: true,
    preload: false,
    autoRedraw: false,
    eventsThrough: false,
    visibleContent: false
  };

  return GLSurface;
};