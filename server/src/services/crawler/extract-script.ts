/**
 * Runs inside the scanned page via page.evaluate(). Kept as a plain string so that bundler
 * helpers are never injected into the browser context. It returns computed styles and short
 * text samples only: page HTML is never captured or stored.
 */
export const EXTRACT_SCRIPT = String.raw`
(function (maxElements) {
  var PROPS = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderTopLeftRadius',
    'boxShadow', 'textDecorationLine', 'textTransform', 'letterSpacing', 'width', 'height'];
  var seen = new Set();
  var out = [];
  var links = [];

  function visible(el, cs) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }
  function text(el) {
    var t = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || '');
    return String(t).replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  function capture(el, type, limit) {
    if (seen.has(el) || out.length >= maxElements) return false;
    var cs = getComputedStyle(el);
    if (!visible(el, cs)) return false;
    var styles = {};
    for (var i = 0; i < PROPS.length; i++) styles[PROPS[i]] = cs[PROPS[i]] || '';
    seen.add(el);
    out.push({ type: type, tag: el.tagName.toLowerCase(), text: text(el), styles: styles });
    return true;
  }
  function collect(selector, type, limit) {
    var nodes = document.querySelectorAll(selector);
    var count = 0;
    for (var i = 0; i < nodes.length && count < limit; i++) {
      if (capture(nodes[i], type)) count++;
    }
  }

  var share = Math.floor(maxElements / 5);
  collect('button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]', 'button', share);
  collect('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="image"]):not([type="file"]), select, textarea', 'input', share);
  collect('h1, h2, h3, h4, h5, h6', 'heading', share);
  collect('a[href]:not([role="button"])', 'link', share);

  var candidates = document.querySelectorAll('article, section, li, div, aside');
  var cards = 0;
  for (var j = 0; j < candidates.length && cards < share && out.length < maxElements; j++) {
    var el = candidates[j];
    if (seen.has(el) || el.children.length === 0) continue;
    var cs = getComputedStyle(el);
    var bordered = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    var shadowed = cs.boxShadow && cs.boxShadow !== 'none';
    if (!bordered && !shadowed) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 60 || r.width > window.innerWidth * 0.9) continue;
    if (parseFloat(cs.paddingTop) < 8 && parseFloat(cs.paddingLeft) < 8) continue;
    if (capture(el, 'card')) cards++;
  }

  var anchors = document.querySelectorAll('a[href]');
  for (var k = 0; k < anchors.length && links.length < 200; k++) links.push(anchors[k].href);

  return { elements: out, links: links };
})
`;
