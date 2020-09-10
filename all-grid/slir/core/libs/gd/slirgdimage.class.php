<?php
/**
 * Class for working with the GD image library
 *
 * This file is part of SLIR (Smart Lencioni Image Resizer).
 *
 * Copyright (c) 2014 Joe Lencioni <joe.lencioni@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @copyright Copyright © 2014, Joe Lencioni
 * @license MIT
 * @since 2.0
 * @package SLIR
 */

 require_once dirname(__FILE__) . '/../slirimagelib.interface.php';
 require_once dirname(__FILE__) . '/../slirimage.class.php';

/**
 * Class for working with the GD image library
 * @package SLIR
 * @since 2.0
 */
class SLIRGDImage extends SLIRImage implements SLIRImageLibrary
{

  /**
   * @var resource GD image resource
   */
  private $image;

  /**
   * @var string $data
   */
  private $data;

  private $transparencyEnabled = false;

  /**
   * @param string $path
   * @return void
   * @since 2.0
   */
  public function __construct($path = null)
  {
    // Allows some funky JPEGs to work instead of breaking everything
    ini_set('gd.jpeg_ignore_warning', '1');

    return parent::__construct($path);
  }

  /**
   * @return void
   * @since 2.0
   */
  public function __destruct()
  {
    unset(
        $this->image
    );
    return parent::__destruct();
  }

  /**
   * Gets a hash that represents the properties of the image.
   *
   * Used for caching.
   *
   * @param $infosToInclude
   * @return string
   * @since 2.0
   */
  public function getHash(array $infosToInclude = array())
  {
    $infos  = array(
    );

    $infos = array_merge($infos, $infosToInclude);

    return parent::getHash($infos);
  }

  /**
   * @return resource
   * @since 2.0
   */
  public function getImage()
  {
    if ($this->image === null) {
      if ($this->getPath() === null) {
        $this->create();
      } else {
        try {
          if ($this->isJPEG()) {
            $this->image  = imagecreatefromjpeg($this->getFullPath());
          } else if ($this->isGIF()) {
            $this->image  = imagecreatefromgif($this->getFullPath());
          } else if ($this->isPNG()) {
            $this->image  = imagecreatefrompng($this->getFullPath());
          } else if ($this->isBMP()) {
            $this->image  = $this->imagecreatefrombmp($this->getFullPath());
          }
        } catch (Exception $e) {
          // Try an alternate catch-all method
          $this->image  = imagecreatefromstring(file_get_contents($this->getFullPath()));
        }

        $this->info = null;
      }
    }

    return $this->image;
  }

  /**
   * @since 2.0
   * @param string $path path to BMP file
   * @return resource
   * @link http://us.php.net/manual/en/function.imagecreatefromwbmp.php#86214
   */
  public function imagecreatefrombmp($path)
  {
    // Load the image into a string
    $read = file_get_contents($path);

    $temp = unpack('H*', $read);
    $hex  = $temp[1];
    $header = substr($hex, 0, 108);

    // Process the header
    // Structure: http://www.fastgraph.com/help/bmp_header_format.html
    if (substr($header, 0, 4) == '424d') {
      // Get the width 4 bytes
      $width  = hexdec($header[38] . $header[39] . $header[36] . $header[37]);

      // Get the height 4 bytes
      $height = hexdec($header[46] . $header[47] . $header[44] . $header[45]);
    }

    // Define starting X and Y
    $x  = 0;
    $y  = 1;

    // Create newimage
    $image  = imagecreatetruecolor($width, $height);

    // Grab the body from the image
    $body = substr($hex, 108);

    // Calculate if padding at the end-line is needed
    // Divided by two to keep overview.
    // 1 byte = 2 HEX-chars
    $bodySize    = (strlen($body) / 2);
    $headerSize  = ($width * $height);

    // Use end-line padding? Only when needed
    $usePadding = ($bodySize > ($headerSize * 3) + 4);

    // Using a for-loop with index-calculation instaid of str_split to avoid large memory consumption
    // Calculate the next DWORD-position in the body
    for ($i = 0; $i < $bodySize; $i += 3) {
        // Calculate line-ending and padding
        if ($x >= $width) {
          // If padding needed, ignore image-padding
          // Shift i to the ending of the current 32-bit-block
          if ($usePadding) {
            $i += $width % 4;
          }

          // Reset horizontal position
          $x  = 0;

          // Raise the height-position (bottom-up)
          ++$y;

          // Reached the image-height? Break the for-loop
          if ($y > $height) {
            break;
          }
        }

      // Calculation of the RGB-pixel (defined as BGR in image-data)
      // Define $iPos as absolute position in the body
      $iPos = $i * 2;
      $r    = hexdec($body[$iPos + 4] . $body[$iPos + 5]);
      $g    = hexdec($body[$iPos + 2] . $body[$iPos + 3]);
      $b    = hexdec($body[$iPos] . $body[$iPos + 1]);

      // Calculate and draw the pixel
      $color  = imagecolorallocate($image, $r, $g, $b);
      imagesetpixel($image, $x, $height - $y, $color);

      // Raise the horizontal position
      ++$x;
    }

    // Unset the body / free the memory
    unset($body);

    // Return image-object
    return $image;
  }

  /**
   * Resamples the image into the destination image
   * @param SLIRGDImage $destination
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function resample(SLIRImageLibrary $destination)
  {
    imagecopyresampled(
        $destination->getImage(),
        $this->getImage(),
        0,
        0,
        0,
        0,
        $destination->getWidth(),
        $destination->getHeight(),
        $this->getWidth(),
        $this->getHeight()
    );

    return $this;
  }

  /**
   * Copies the image into the destination image without reszing
   * @param SLIRGDImage $destination
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function copy(SLIRImageLibrary $destination)
  {
    imagecopy(
        $destination->getImage(),
        $this->getImage(),
        0,
        0,
        0,
        0,
        $this->getWidth(),
        $this->getHeight()
    );

    return $this;
  }

  /**
   * Gets width, height, and iptc information from the image
   * @param string $info
   * @return mixed
   * @since 2.0
   */
  public function getInfo($info = null)
  {
    if ($this->info === null) {
      if ($this->getPath() === null) {
        // If there is no path, get the info from the image resource
        if ($this->getImage() === null) {
          // There is nothing to get
        } else {
          $this->info['width']  = imagesx($this->getImage());
          $this->info['width']  = imagesy($this->getImage());
          // @todo mime
        }
      } else {
        // There is a path, so get the info from the file
        $this->info = getimagesize($this->getFullPath(), $extraInfo);

        if ($this->info === false) {
          header('HTTP/1.1 400 Bad Request');
          throw new RuntimeException('getimagesize failed (source file may not be an image): ' . $this->getFullPath());
        }

        $this->info['width']  =& $this->info[0];
        $this->info['height'] =& $this->info[1];

        // IPTC
        if (is_array($extraInfo) && isset($extraInfo['APP13'])) {
          $this->info['iptc'] = iptcparse($extraInfo['APP13']);
        }
      }
    }

    if ($info === null) {
      return $this->info;
    } else {
      if (isset($this->info[$info])) {
        return $this->info[$info];
      } else {
        return null;
      }
    }
  }

  /**
   * Creates a new, blank image
   * @return SLIRImageLibrary
   */
  public function create()
  {
    $this->image  = imagecreatetruecolor($this->getWidth(), $this->getHeight());

    return $this;
  }

  /**
   * Turns on the alpha channel to enable transparency in the image
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function enableTransparency()
  {
    imagealphablending($this->getImage(), false);
    imagesavealpha($this->getImage(), true);

    $this->transparencyEnabled = true;

    return $this;
  }

  /**
   * Fills the image with the set background color
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function fill()
  {
    $color = $this->getBackground();

    if ($color === null) {
      $color = "ffffff";
    }

    $background = null;

    if ($this->transparencyEnabled === true) {
      $background = imagecolorallocatealpha(
        $this->getImage(),
        hexdec($color[0].$color[1]),
        hexdec($color[2].$color[3]),
        hexdec($color[4].$color[5]),
        127
      );
    }
    else {

      $background = imagecolorallocate(
          $this->getImage(),
          hexdec($color[0].$color[1]),
          hexdec($color[2].$color[3]),
          hexdec($color[4].$color[5])
      );

    }

    imagefilledrectangle($this->getImage(), 0, 0, $this->getWidth(), $this->getHeight(), $background);

    return $this;
  }

  /**
   * Turns interlacing on or off
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function interlace()
  {
    imageinterlace($this->getImage(), $this->getProgressive());
    return $this;
  }

  /**
   * Gets the class that will be used to determine the crop offset for the image
   *
   * @since 2.0
   * @return SLIRCropper
   */
  final public function getCropperClass()
  {
    $cropClass  = strtolower($this->getCropper());
    $fileName   = SLIRConfig::$pathToSLIR . "/core/libs/gd/croppers/$cropClass.class.php";
    $class      = 'SLIRCropper' . ucfirst($cropClass);

    if (!file_exists($fileName)) {
      throw new RuntimeException('The requested cropper could not be found: ' . $fileName);
    }

    require_once $fileName;

    return new $class();
  }

  /**
   * Performs the actual cropping of the image
   *
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function crop()
  {
    if ($this->croppingIsNeeded()) {
      $cropper  = $this->getCropperClass();
      $offset   = $cropper->getCrop($this);
      $this->cropImage($offset['x'], $offset['y']);
    }

    return $this;
  }

  /**
   * Performs the actual cropping of the image
   *
   * @since 2.0
   * @param integer $leftOffset Number of pixels from the left side of the image to crop in
   * @param integer $topOffset Number of pixels from the top side of the image to crop in
   * @param string $fill color in hex
   * @return boolean
   */
  private function cropImage($leftOffset, $topOffset)
  {
    $class    = __CLASS__;
    $cropped  = new $class();

    $cropped->setMimeType($this->getMimeType()) // To enable again transparency on PNGs !
            ->setWidth($this->getCropWidth())
            ->setHeight($this->getCropHeight())
            ->setBackground($this->getBackground());
           

    $cropped->background();

    // Copy rendered image to cropped image
    imagecopy(
        $cropped->getImage(),
        $this->getImage(),
        0,
        0,
        $leftOffset,
        $topOffset,
        $cropped->getWidth(),
        $cropped->getHeight()
    );

    // Replace pre-cropped image with cropped image
    $this->destroy();
    $this->image          = $cropped->getImage();

    // Update width and height
    $this->info['width']  = $cropped->getWidth();
    $this->info['height'] = $cropped->getHeight();

    // Clean up memory
    unset($cropped);

    return $this;
  }

  /**
   * Sharpens the image
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function sharpen()
  {
    if ($this->isSharpeningDesired()) {
      imageconvolution(
          $this->getImage(),
          $this->sharpenMatrix($this->getSharpeningFactor()),
          $this->getSharpeningFactor(),
          0
      );
    }

    return $this;
  }

  /**
   * @param integer $sharpness
   * @return array
   * @since 2.0
   */
  private function sharpenMatrix($sharpness)
  {
    return array(
      array(-1, -2, -1),
      array(-2, $sharpness + 12, -2),
      array(-1, -2, -1)
    );
  }

  /**
   * Determines if the image can be converted to a palette image
   *
   * @since 2.0
   * @return array colors in image, otherwise false if image is not palette
   */
  private function isPalette()
  {
    $colors = array();
    $image  = $this->getImage();
    // Loop over all of the pixels in the image, counting the colors and checking their alpha channels
    for ($x = 0, $width = $this->getWidth(); $x < $width; ++$x) {
      for ($y = 0, $height = $this->getHeight(); $y < $height; ++$y) {
        $color = imagecolorat($image, $x, $y);

        if (isset($colors[$color])) {
          // This color has already been checked, move on to the next pixel
          continue;
        }

        $colors[$color] = true;

        if (count($colors) > 256) {
          // Too many colors to convert to a palette image without losing quality
          return false;
        }

        // Get the alpha channel of the color
        $alpha  = ($color & 0x7F000000) >> 24;

        // What is the threshold for visibility in an alpha channel? (out of 127)
        if ($alpha > 1 && $alpha < 126) {
          return false;
        }
      }
    }

    return $colors;
  }

  /**
   * @since 2.0
   * @return void
   * @link http://us.php.net/manual/ro/function.imagetruecolortopalette.php#44803
   */
  private function trueColorToPalette($dither, $ncolors)
  {
    $palette  = imagecreate($this->getWidth(), $this->getHeight());

    imagecopy(
        $palette,
        $this->getImage(),
        0,
        0,
        0,
        0,
        $this->getWidth(),
        $this->getHeight()
    );

    $this->destroy();
    $this->image  = $palette;
    $this->setMimeType('image/png');

    /* For some reason, ImageTrueColorToPalette produces horrible results for true color images that have less than 256 colors. http://stackoverflow.com/questions/5187480/imagetruecolortopalette-losing-colors

    $colorsHandle = ImageCreateTrueColor($this->getWidth(), $this->getHeight());
    ImageCopy($colorsHandle, $this->image, 0, 0, 0, 0, $this->getWidth(), $this->getHeight());
    ImageTrueColorToPalette($this->image, $dither, $ncolors);
    ImageColorMatch($colorsHandle, $this->image);
    ImageDestroy($colorsHandle);
    */
  }

  /**
   * @since 2.0
   * @return SLIRImage
   */
  public function optimize()
  {
    $colors = $this->isPalette();
    if ($colors !== false) {
      $this->trueColorToPalette(false, count($colors));
    }
    return $this;
  }

  /**
   * @return string
   */
  public function getData()
  {
    if ($this->data === null) {
      ob_start();
      $this->output();
      $this->data = ob_get_clean();
    }

    return $this->data;
  }

  /**
   * Outputs the image
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function output()
  {
    $this->render(null);
    return $this;
  }

  /**
   * Saves the image to disk
   * @param string $filename
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function save()
  {
    $this->render($this->getFullPath());
    return $this;
  }

  /**
   * @param string $path
   * @return boolean
   * @since 2.0
   */
  private function render($path)
  {
    if ($this->isJPEG()) {
      return imagejpeg($this->image, $path, $this->getQuality());
    } else if ($this->isPNG()) {
      return imagepng($this->image, $path, (integer) round(10 - ($this->getQuality() / 10)));
    } else if ($this->isGIF()) {
      return imagegif($this->image, $path);
    } else {
      return false;
    }
  }

  /**
   * Destroys the image
   * @return SLIRImageLibrary
   * @since 2.0
   */
  public function destroy()
  {
    if ($this->image !== null) {
      imagedestroy($this->image);
      // We need to set the image to null because imagedestroy() doesn't
      $this->image = null;
    }
    return $this;
  }
}
