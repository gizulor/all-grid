# all-grid: a Textpattern theme for image-rich websites

[Demonstration Site](https://all-grid.all-sorts.biz)

<!-- <picture>
  <img width="480" alt="all-grid" src="https://all-grid.local/images/517.webp">
</picture> -->

Mix Textpattern pages and forms with a library of css classes to generate varied layouts. all-grid is the template I use as a starting point in my website development.

## Modular Design Component Library
Atomic Design principles guide the naming of css classes and Textpattern forms.

## Incorporate Images &amp; Video any which way

Responsive images served automatically, flexible typography on a baseline grid. Article images are displayed in groups, others can be displayed inline with your body copy.

## Tools to simplify Web Development

Article edit and image edit links simplify workflow (if you’re logged into Textpattern’s admin interface); the public site includes article-edit links and image-edit links. Know which _Page_ or _Form_ is being used ; hover over an element on the page, and its _Form_ or _Page_ name is revealed — useful in large sites with a variety of _Forms_ in use.

## Installation

Upload to your Textpattern Themes folder via ftp, and use the Textpattern Themes tab to load the theme from disk. Assign section(s) to all-grid.

For full functionality, [glz_custom_fields](http://github.com/jools-r/glz_custom_fields) is required, with custom fields:

*video*

Uses shortcode m_embed.txp — eg. `<txp::m_embed background='<txp:custom_field name="video" />' />` , `<txp::m_embed social='<txp:custom_field name="video" />' />` , `<txp::m_embed file='<txp:custom_field name="video" />' />` etc.

*links_to_url*

Used to override txp:permlink on list pages

*details* configure as a textarea

Not used by allgrid, but useful if you use all_admin.scss and require another textarea for your project


## Usage

Experiment with article status: sticky, and override form. Do the same with the minimal [default page](https://github.com/gizulor/all-grid/blob/master/pages/default.txp), using classes derived from [layouts classes](https://github.com/gizulor/all-grid/blob/master/atomic-docs/scss/6-layouts) and others.

Use `<txp::figure id="1" lightbox class="a_image--inline large" captionclass="b_small" />` or `<txp::o_inline_gallery id="1,2,3" />` in an article field (or in a _Page_ or _Form_).

While it is possible to edit _styles/main.css_ directly, it is preferable to edit the scss stubs in the AtomicDocs instead, and then use a utility to build your css (I use CodeKit).


## Includes:

### [SLIR](https://github.com/lencioni/SLIR) image resizing script

All image requests are made by the _Form_ [figure.txp](https://github.com/gizulor/all-grid/blob/master/forms/misc/figure.txp), which is configured to use SLIR by default (and run under php8). Code blocks can be hidden/un-hidden to use smd_thumbnail or display the original image instead.

### lazysizes.js

Automatic responsive image sizes (and video autoplay when in view).

### atomicdocs style library to help manage scss

A link to the library is available in the site footer _forms/o_footer.txp_ if you're logged in.

### grid-based css for Textpattern's Admin:Write panel

See [all_admin.scss](https://github.com/gizulor/all-grid/blob/master/all_admin.scss). Place in your admin theme eg. _/textpattern/admin-themes/hive/assets/css/all_admin.css_ and update Textpattern's config.php accordingly.


all-grid is free and open source software, and requires Textpattern v4.80 and above.



