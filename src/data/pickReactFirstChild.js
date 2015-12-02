const React = require("../react-runtime");

module.exports = function pickReactFirstChild (children) {
  return React.Children.count(children) === 1 ?
    (children instanceof Array ? children[0] : children) :
    null;
};
