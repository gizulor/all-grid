# A Textpattern Theme for image-rich websites

Suitable for small to large sites with flexible image display requirements.

all-grid is free and open source software, and requires Textpattern v4.80 and above.

[Demo Site](https://all-grid.all-sorts.biz)

## all-grid:

* all-grid uses the native proportion of your images to inform a grid layout
* all-grid treats mobiles as first class citizens (the layout is consistent across screen sizes)
* all-grid mixes articles to generate varied layouts

A variety of layout types of available:

## Grid Loose

Displays articles which have at least one image specified in their article image field.
Images are displayed with their original proportions, allowing an informal grid layout.

## Grid Loose Sans

Displays articles which have no images specified in their article image field.

## Grid Formal

Displays articles which have at least one image specified in their article image field.
Images are displayed at fixed proportions, resulting in a rigid grid layout.

## Grid Formal Mix

Displays a mix of articles with and without images

* Grid types can be assigned to different sections, and be freely mixed across the site.
* Choose between site menu variants: plain, hamburger-grid and hamburger-plain.
* Aspects like colour, typography and layout spacing can be controlled via changing values in the theme stylesheet.


## Images

Specify images by entering their ids in an _Article image_ field, or inline using the included  <txp::figure /> shortcode.

## Responsive image sizing

To ensure optimal download speeds of potentially scores of images on a page, all-grid includes [lazysizes](https://github.com/aFarkas/lazysizes), a Javascript library which automatically calculates the sizes attribute for images you use.

To fully exploit this you need to install image-resizing functionality, like [smd_thumbnail](https://stefdawson.com/sw/plugins/smd_thumbnail) or a php script like [Smart Lencioni Image Resizer](https://github.com/lencioni/SLIR), and then hide or unhide the relevant code block in the _figure.txp_ form.

By default, all-grid ships with no image-resizing functionality (your images are fetched at their original resolution). The all-grid demo site uses [SLIR](https://github.com/lencioni/SLIR).

## Image resizing options

* no resizing – original image displayed (default)
* resizing via smd_thumbnail
* resizing via SLIR

[lazysizes.js](https://github.com/aFarkas/lazysizes) provides automatic sizes calculation for responsive images.

## Flexiblity

grid-loose and grid-formal variants, freely interchangeable via:

* section pages
* article forms

Layouts can be changed via:

1. changing the content i.e. with or without article images, sticky vs. live articles, form overrides
2. changing css variable values in the stylesheet
3. swapping element class names in the pages and forms
4. in the stylesheet css (the last resort :)

