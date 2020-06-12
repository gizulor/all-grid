# A Textpattern Theme for image-rich websites

Suitable for small to large sites with flexible image display requirements.


![all-grid screenshot](/styles/img/all-grid-theme.jpg)

all-grid is free and open source software, and requires Textpattern v4.80 and above.




[Demo Site](https://all-grid.all-sorts.biz)

## all-grid:

* uses a plain ui, your imagery is the focus
* uses the proportion of your images to inform the grid layout
* treats mobiles as first class citizens (the layout is consistent across screen sizes)
* can be used without imagery
* sticky articles are given prominence on any list page

## all-grid!

Specify a `--grid-base` in the theme stylesheet, and all-grid will adjust your layout accordingly. If you use the css unit `vw` eg. `--grid-base: 15vw;`, the grid will maintain consistent proportions across all screen sizes. Use `px` eg. `--grid-base: 160px;` and the grid will change as the viewport changes.  

By default, front page articles are listed randomly (try reloading the page to see how all-grid copes with various image proportions). Other sections are listed using default sorting.

## image handling

all-grid includes [SLIR(Smart Lencioni Image Resizer)](/slir/), a PHP script to automatically crop and resize images that you have uploaded into the _Content:Images_ tab. Specify images by entering their ids in an _Article image_ field.

## typography

Font sizes adjust automatically depending on the width of the viewport, and can be changed using the set up variables in the theme stylesheet. 
