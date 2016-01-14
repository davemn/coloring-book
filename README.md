A `<canvas>`-based coloring book. Stores your artwork in [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage). Stamp-based brushes, and support for multi-touch.

Try it out:

```
$>cd <path to parent directory served by Apache>
$>git clone <repo url>/coloring-book.git
$>cd coloring-book/
$>bower install
$>lessc less/index.less index.css
$>mkdir assets
```

In your assets folder, you'll need three sets of files:

* `.png` files named `page-<NN>.png`, one for each page in your coloring book. Starts with `page-00.png`. Make sure these are black lines on a transparent background (**no** anti-aliasing on the line edges).
* `brush.png`, a white image on a transparent background. Will be the shape of your brush (color determined by the user at runtime).
* `logo-tile.png`, a square image that can tile in both directions. Serves as the background to the drawing area. If you prefer a solid color, this image can be a 1x1 image of that color.

