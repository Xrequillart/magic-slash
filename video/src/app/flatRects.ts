import { boxIn } from '../film/Annotations'

/**
 * ELEMENTS THAT MEASURE THEMSELVES, MEASURED FLAT.
 *
 * React Flow places its edges from the ports' getBoundingClientRect, and a DS `Menu`
 * places its panel from its anchor's. Under the film's 3D camera those rects are the
 * projected, tilted ones, so the edges missed their ports and the panel landed off its
 * button. Inside a `.film-flat` subtree they are answered in the window's own flat
 * coordinates instead, which is what both would read in the app.
 */
const native = Element.prototype.getBoundingClientRect

Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
  if (this instanceof HTMLElement && this.closest('.film-flat')) {
    const root = this.closest<HTMLElement>('.app-root')
    if (root) {
      const box = boxIn(root, this)
      return new DOMRect(box.x, box.y, box.w, box.h)
    }
  }
  return native.call(this)
}
